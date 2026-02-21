import { IsString, IsOptional, IsBoolean, IsArray, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAlbumDto {
  @ApiProperty({ example: 'mi-album', description: 'Slug único para la URL del álbum' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 'Mi Álbum', description: 'Título del álbum' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Descripción del álbum', description: 'Descripción opcional' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'http://localhost:4000/uploads/images/cover.jpg', description: 'URL de imagen de portada' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ example: [], description: 'IDs de imágenes en el álbum' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ example: true, description: 'Si el álbum es público' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ example: '2024-01-15T10:00:00.000Z', description: 'Fecha de publicación pública' })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @ApiPropertyOptional({ example: 0, description: 'Orden en la galería (menor = primero)' })
  @IsOptional()
  @IsNumber()
  order?: number;
}

