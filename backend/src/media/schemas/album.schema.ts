import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AlbumDocument = Album & Document;

@Schema({
  timestamps: true,
  collection: 'albums',
})
export class Album {
  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop()
  coverImage?: string; // URL de imagen de portada

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Media' }] })
  images: Types.ObjectId[]; // IDs de imágenes en el álbum

  @Prop({ default: true })
  isPublic: boolean;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  order: number; // Orden de visualización en la galería (menor = primero)

  @Prop()
  publishedAt?: Date; // Fecha de publicación pública
}

export const AlbumSchema = SchemaFactory.createForClass(Album);

// Índices para mejorar el rendimiento
AlbumSchema.index({ slug: 1 });
AlbumSchema.index({ isPublic: 1 });
AlbumSchema.index({ publishedAt: -1 });
AlbumSchema.index({ createdAt: -1 });
AlbumSchema.index({ order: 1 });
