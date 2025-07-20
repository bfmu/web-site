import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({
    example: 'mi-primer-post',
    description: 'Slug único para la URL del post',
  })
  @IsString()
  slug: string;

  @ApiProperty({ example: 'Mi Primer Post', description: 'Título del post' })
  @IsString()
  title: string;

  @ApiProperty({
    example: '# Contenido en Markdown',
    description: 'Contenido del post en formato Markdown',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    example: 'Descripción breve del post',
    description: 'Descripción opcional del post',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: '/images/post-image.jpg',
    description: 'URL de la imagen de portada',
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({
    example: ['javascript', 'web'],
    description: 'Lista de etiquetas (tags)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    example: 'Desarrollo',
    description: 'Categoría del post',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Indica si el post es un borrador',
  })
  @IsOptional()
  @IsBoolean()
  draft?: boolean;

  @ApiProperty({
    example: '2024-01-15T10:00:00.000Z',
    description: 'Fecha de publicación en formato ISO',
  })
  @IsDateString()
  published: string;

  @ApiPropertyOptional({ example: 'es', description: 'Idioma del post' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Tiempo estimado de lectura en minutos',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  readingTime?: number;
}
