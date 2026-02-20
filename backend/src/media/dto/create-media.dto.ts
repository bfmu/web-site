import { IsString, IsOptional, IsNumber, IsBoolean, IsMimeType } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMediaDto {
  @ApiProperty({ example: 'image.jpg', description: 'Nombre del archivo' })
  @IsString()
  filename: string;

  @ApiProperty({ example: 'Mi Imagen.jpg', description: 'Nombre original del archivo' })
  @IsString()
  originalName: string;

  @ApiProperty({ example: '/uploads/images/image.jpg', description: 'Ruta relativa del archivo' })
  @IsString()
  path: string;

  @ApiProperty({ example: 'http://localhost:4000/uploads/images/image.jpg', description: 'URL completa del archivo' })
  @IsString()
  url: string;

  @ApiProperty({ example: 'image/jpeg', description: 'Tipo MIME del archivo' })
  @IsString()
  mimeType: string;

  @ApiProperty({ example: 1024000, description: 'Tamaño del archivo en bytes' })
  @IsNumber()
  size: number;

  @ApiPropertyOptional({ example: 1920, description: 'Ancho de la imagen en píxeles' })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ example: 1080, description: 'Alto de la imagen en píxeles' })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: 'image', description: 'Tipo de medio (image, video, document)' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: false, description: 'Si está en galería pública' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'ID del álbum al que pertenece' })
  @IsOptional()
  @IsString()
  albumId?: string;

  @ApiPropertyOptional({ example: 'Descripción de la imagen', description: 'Texto alternativo' })
  @IsOptional()
  @IsString()
  alt?: string;

  @ApiPropertyOptional({ example: 'Descripción detallada', description: 'Descripción del medio' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 0, description: 'Orden dentro del álbum' })
  @IsOptional()
  @IsNumber()
  order?: number;
}

