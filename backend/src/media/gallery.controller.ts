import {
  Controller,
  Get,
  Param,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AlbumService } from './album.service';
import { MediaService } from './media.service';

@ApiTags('gallery')
@Controller('gallery')
export class GalleryController {
  constructor(
    private readonly albumService: AlbumService,
    private readonly mediaService: MediaService,
  ) {}

  @Get('albums')
  @ApiOperation({ summary: 'Listar álbumes públicos' })
  @ApiResponse({ status: 200, description: 'Lista de álbumes públicos' })
  async getPublicAlbums() {
    const result = await this.albumService.findAll({
      isPublic: true,
      page: 1,
      limit: 100,
    });
    // Filtrar solo álbumes que tienen imágenes
    const albumsWithImages = result.albums.filter(
      (album) => album.images && album.images.length > 0,
    );
    return {
      albums: albumsWithImages,
      pagination: result.pagination,
    };
  }

  @Get('albums/:slug')
  @ApiOperation({ summary: 'Obtener álbum público por slug' })
  @ApiParam({ name: 'slug', description: 'Slug del álbum' })
  @ApiResponse({ status: 200, description: 'Álbum encontrado' })
  async getPublicAlbum(@Param('slug') slug: string) {
    const album = await this.albumService.findOne(slug);
    
    // Verificar que sea público
    if (!album.isPublic) {
      throw new NotFoundException(`Album with slug "${slug}" not found`);
    }

    // Incrementar contador de vistas (sin esperar para no bloquear la respuesta)
    this.albumService.update(slug, {
      viewCount: (album.viewCount || 0) + 1,
    } as any).catch((err) => {
      console.error('Error updating view count:', err);
    });

    return album;
  }

  @Get('images/:id')
  @ApiOperation({ summary: 'Obtener imagen pública por ID' })
  @ApiParam({ name: 'id', description: 'ID del media' })
  @ApiResponse({ status: 200, description: 'Imagen encontrada' })
  async getPublicImage(@Param('id') id: string) {
    const media = await this.mediaService.findOne(id);
    
    // Verificar que sea público
    if (!media.isPublic) {
      throw new NotFoundException(`Image with ID "${id}" not found`);
    }

    return media;
  }
}

