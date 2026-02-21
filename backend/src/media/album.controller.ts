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
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AlbumService } from './album.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';

@ApiTags('albums')
@Controller('albums')
export class AlbumController {
  constructor(private readonly albumService: AlbumService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear álbum (requiere autenticación)' })
  @ApiResponse({ status: 201, description: 'Álbum creado correctamente' })
  async create(@Body() createAlbumDto: CreateAlbumDto) {
    return this.albumService.create(createAlbumDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar álbumes (requiere autenticación)' })
  @ApiQuery({ name: 'isPublic', required: false, description: 'Si es público' })
  @ApiQuery({ name: 'page', required: false, description: 'Página' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite por página' })
  @ApiResponse({ status: 200, description: 'Lista de álbumes' })
  async findAll(@Query() query: any) {
    return this.albumService.findAll({
      isPublic: query.isPublic === 'true' ? true : query.isPublic === 'false' ? false : undefined,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 50,
    });
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reordenar álbumes (requiere autenticación)' })
  @ApiResponse({ status: 200, description: 'Álbumes reordenados' })
  async reorder(@Body() body: { slugs: string[] }) {
    if (!body.slugs || !Array.isArray(body.slugs)) {
      throw new BadRequestException('slugs must be a non-empty array');
    }
    return this.albumService.reorderAlbums(body.slugs);
  }

  @Get(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener álbum por slug (requiere autenticación)' })
  @ApiParam({ name: 'slug', description: 'Slug del álbum' })
  @ApiResponse({ status: 200, description: 'Álbum encontrado' })
  async findOne(@Param('slug') slug: string) {
    return this.albumService.findOne(slug);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar álbum (requiere autenticación)' })
  @ApiParam({ name: 'slug', description: 'Slug del álbum' })
  @ApiResponse({ status: 200, description: 'Álbum actualizado' })
  async update(@Param('slug') slug: string, @Body() updateAlbumDto: UpdateAlbumDto) {
    return this.albumService.update(slug, updateAlbumDto);
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar álbum (requiere autenticación)' })
  @ApiParam({ name: 'slug', description: 'Slug del álbum' })
  @ApiResponse({ status: 204, description: 'Álbum eliminado' })
  async remove(@Param('slug') slug: string) {
    await this.albumService.delete(slug);
  }

  @Post(':slug/images/batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar múltiples imágenes al álbum (requiere autenticación)' })
  @ApiParam({ name: 'slug', description: 'Slug del álbum' })
  @ApiResponse({ status: 200, description: 'Imágenes agregadas al álbum' })
  async addImagesBatch(
    @Param('slug') slug: string,
    @Body() body: { mediaIds: string[] },
  ) {
    if (!body.mediaIds || !Array.isArray(body.mediaIds)) {
      throw new BadRequestException('mediaIds must be a non-empty array');
    }
    return this.albumService.addImagesBatch(slug, body.mediaIds);
  }

  @Post(':slug/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar imagen al álbum (requiere autenticación)' })
  @ApiParam({ name: 'slug', description: 'Slug del álbum' })
  @ApiResponse({ status: 200, description: 'Imagen agregada al álbum' })
  async addImage(@Param('slug') slug: string, @Body() body: { mediaId: string }) {
    if (!body.mediaId) {
      throw new BadRequestException('Media ID is required');
    }
    return this.albumService.addImage(slug, body.mediaId);
  }

  @Delete(':slug/images/:mediaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover imagen del álbum (requiere autenticación)' })
  @ApiParam({ name: 'slug', description: 'Slug del álbum' })
  @ApiParam({ name: 'mediaId', description: 'ID del media' })
  @ApiResponse({ status: 200, description: 'Imagen removida del álbum' })
  async removeImage(@Param('slug') slug: string, @Param('mediaId') mediaId: string) {
    return this.albumService.removeImage(slug, mediaId);
  }

  @Patch(':slug/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reordenar imágenes del álbum (requiere autenticación)' })
  @ApiParam({ name: 'slug', description: 'Slug del álbum' })
  @ApiResponse({ status: 200, description: 'Imágenes reordenadas' })
  async reorderImages(@Param('slug') slug: string, @Body() body: { imageIds: string[] }) {
    if (!body.imageIds || !Array.isArray(body.imageIds)) {
      throw new BadRequestException('imageIds must be an array');
    }
    return this.albumService.reorderImages(slug, body.imageIds);
  }

  @Patch(':slug/cover')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Establecer portada del álbum (requiere autenticación)' })
  @ApiParam({ name: 'slug', description: 'Slug del álbum' })
  @ApiResponse({ status: 200, description: 'Portada establecida' })
  async setCover(@Param('slug') slug: string, @Body() body: { mediaId: string }) {
    if (!body.mediaId) {
      throw new BadRequestException('Media ID is required');
    }
    return this.albumService.setCover(slug, body.mediaId);
  }
}

