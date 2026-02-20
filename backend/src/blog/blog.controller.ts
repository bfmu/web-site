import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  UsePipes,
  HttpStatus,
  HttpCode,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BlogService } from './blog.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostDto } from './dto/query-post.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un nuevo post (requiere autenticación)' })
  @ApiBody({ type: CreatePostDto })
  @ApiResponse({ status: 201, description: 'Post creado correctamente' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createPostDto: CreatePostDto) {
    return this.blogService.create(createPostDto);
  }

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir imagen (requiere autenticación)' })
  @ApiResponse({ status: 201, description: 'Imagen subida correctamente' })
  async uploadImage(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    // Validar que sea una imagen
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('El archivo debe ser una imagen');
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('La imagen no puede ser mayor a 10MB');
    }

    // Crear directorio de uploads si no existe
    const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${originalName}`;
    const filePath = path.join(uploadsDir, fileName);

    // Guardar archivo
    fs.writeFileSync(filePath, file.buffer);

    // Retornar URL relativa
    const imageUrl = `/uploads/images/${fileName}`;
    
    return {
      url: imageUrl,
      filename: fileName,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los posts con filtros y paginación' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'draft', required: false })
  @ApiQuery({ name: 'language', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiResponse({ status: 200, description: 'Lista de posts' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async findAll(@Query() queryDto: QueryPostDto) {
    return this.blogService.findAll(queryDto);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Obtener posts recientes' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Lista de posts recientes' })
  async getRecentPosts(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit) : 5;
    return this.blogService.getRecentPosts(limitNumber);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Obtener todas las categorías' })
  @ApiResponse({ status: 200, description: 'Lista de categorías' })
  @ApiQuery({
    name: 'withCount',
    required: false,
    type: Boolean,
    description: 'Incluir conteo de posts por categoría',
  })
  async getCategories(@Query('withCount') withCount?: string) {
    if (withCount === 'true') {
      return this.blogService.getCategoriesWithCount();
    }
    return this.blogService.getCategories();
  }

  @Get('tags')
  @ApiOperation({ summary: 'Obtener todos los tags' })
  @ApiResponse({ status: 200, description: 'Lista de tags' })
  async getTags() {
    return this.blogService.getTags();
  }

  @Get('validate-slug/:slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validar si un slug está disponible (requiere autenticación)' })
  @ApiParam({ name: 'slug', description: 'Slug a validar' })
  @ApiQuery({ name: 'currentSlug', required: false, description: 'Slug actual del post (para edición)' })
  @ApiResponse({ status: 200, description: 'Resultado de la validación' })
  async validateSlug(
    @Param('slug') slug: string,
    @Query('currentSlug') currentSlug?: string,
  ) {
    return this.blogService.validateSlug(slug, currentSlug);
  }

  @Get('related/:slug')
  @ApiOperation({ summary: 'Obtener posts relacionados' })
  @ApiParam({ name: 'slug', description: 'Slug del post de referencia' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Lista de posts relacionados' })
  async getRelatedPosts(
    @Param('slug') slug: string,
    @Query('limit') limit?: string,
  ) {
    const limitNumber = limit ? parseInt(limit) : 3;
    return this.blogService.getRelatedPosts(slug, limitNumber);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Obtener un post por slug' })
  @ApiParam({ name: 'slug', description: 'Slug del post' })
  @ApiResponse({ status: 200, description: 'Post encontrado' })
  async findOne(@Param('slug') slug: string) {
    return this.blogService.findOne(slug);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar un post (requiere autenticación)' })
  @ApiParam({ name: 'slug', description: 'Slug del post' })
  @ApiBody({ type: UpdatePostDto })
  @ApiResponse({ status: 200, description: 'Post actualizado' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(
    @Param('slug') slug: string,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.blogService.update(slug, updatePostDto);
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un post (solo admin)' })
  @ApiParam({ name: 'slug', description: 'Slug del post' })
  @ApiResponse({ status: 204, description: 'Post eliminado' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('slug') slug: string) {
    return this.blogService.remove(slug);
  }
}
