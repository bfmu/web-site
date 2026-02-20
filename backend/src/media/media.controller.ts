import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { MediaDocument } from './schemas/media.schema';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir archivo y crear registro de media (requiere autenticación)' })
  @ApiResponse({ status: 201, description: 'Media creado correctamente' })
  async upload(@UploadedFile() file: any, @Body() body?: any) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    // Validar tipo de archivo
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('El archivo debe ser una imagen (JPEG, PNG, GIF, WEBP, SVG)');
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

    // Construir URLs
    const relativePath = `/uploads/images/${fileName}`;
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const fullUrl = `${apiUrl}${relativePath}`;

    // Extraer metadata del body (puede venir como objeto o como string desde FormData)
    const isPublic = body?.isPublic === 'true' || body?.isPublic === true || false;
    const alt = body?.alt || undefined;
    const description = body?.description || undefined;
    const albumId = body?.albumId || undefined;

    // Crear DTO
    const createMediaDto: CreateMediaDto = {
      filename: fileName,
      originalName: file.originalname,
      path: relativePath,
      url: fullUrl,
      mimeType: file.mimetype,
      size: file.size,
      type: 'image',
      isPublic,
      alt: alt && alt.trim() ? alt.trim() : undefined,
      description: description && description.trim() ? description.trim() : undefined,
      albumId: albumId && albumId.trim() ? albumId.trim() : undefined,
    };

    // Crear registro en DB
    const media = await this.mediaService.create(createMediaDto);

    // Convertir documento de Mongoose a objeto plano
    const mediaObj = (media as MediaDocument).toObject();

    return {
      ...mediaObj,
      url: relativePath, // Retornar URL relativa (el frontend construirá la URL completa)
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar medios (requiere autenticación)' })
  @ApiQuery({ name: 'type', required: false, description: 'Tipo de medio' })
  @ApiQuery({ name: 'albumId', required: false, description: 'ID del álbum' })
  @ApiQuery({ name: 'isPublic', required: false, description: 'Si es público' })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda' })
  @ApiQuery({ name: 'page', required: false, description: 'Página' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite por página' })
  @ApiResponse({ status: 200, description: 'Lista de medios' })
  async findAll(@Query() query: any) {
    return this.mediaService.findAll({
      type: query.type,
      albumId: query.albumId,
      isPublic: query.isPublic === 'true' ? true : query.isPublic === 'false' ? false : undefined,
      search: query.search,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 50,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener media por ID (requiere autenticación)' })
  @ApiParam({ name: 'id', description: 'ID del media' })
  @ApiResponse({ status: 200, description: 'Media encontrado' })
  async findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @Get(':id/usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar uso del media (requiere autenticación)' })
  @ApiParam({ name: 'id', description: 'ID del media' })
  @ApiResponse({ status: 200, description: 'Información de uso' })
  async checkUsage(@Param('id') id: string) {
    return this.mediaService.checkUsage(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar metadata del media (requiere autenticación)' })
  @ApiParam({ name: 'id', description: 'ID del media' })
  @ApiResponse({ status: 200, description: 'Media actualizado' })
  async update(@Param('id') id: string, @Body() updateMediaDto: UpdateMediaDto) {
    return this.mediaService.update(id, updateMediaDto);
  }

  @Patch(':id/rename')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renombrar archivo del media (requiere autenticación)' })
  @ApiParam({ name: 'id', description: 'ID del media' })
  @ApiResponse({ status: 200, description: 'Media renombrado' })
  async rename(@Param('id') id: string, @Body() body: { filename: string }) {
    if (!body.filename) {
      throw new BadRequestException('Filename is required');
    }
    return this.mediaService.rename(id, body.filename);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar media (requiere autenticación)' })
  @ApiParam({ name: 'id', description: 'ID del media' })
  @ApiResponse({ status: 204, description: 'Media eliminado' })
  async remove(@Param('id') id: string) {
    await this.mediaService.delete(id);
  }

  @Post(':id/move-to-album')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mover media a álbum (requiere autenticación)' })
  @ApiParam({ name: 'id', description: 'ID del media' })
  @ApiResponse({ status: 200, description: 'Media movido a álbum' })
  async moveToAlbum(@Param('id') id: string, @Body() body: { albumId: string }) {
    if (!body.albumId) {
      throw new BadRequestException('Album ID is required');
    }
    return this.mediaService.moveToAlbum(id, body.albumId);
  }
}

