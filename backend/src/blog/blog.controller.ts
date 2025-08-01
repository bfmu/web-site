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
} from '@nestjs/common';
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
} from '@nestjs/swagger';

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo post' })
  @ApiBody({ type: CreatePostDto })
  @ApiResponse({ status: 201, description: 'Post creado correctamente' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createPostDto: CreatePostDto) {
    return this.blogService.create(createPostDto);
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
  @ApiOperation({ summary: 'Actualizar un post por slug' })
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
  @ApiOperation({ summary: 'Eliminar un post por slug' })
  @ApiParam({ name: 'slug', description: 'Slug del post' })
  @ApiResponse({ status: 204, description: 'Post eliminado' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('slug') slug: string) {
    return this.blogService.remove(slug);
  }
}
