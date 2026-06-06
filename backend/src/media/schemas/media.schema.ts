import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MediaDocument = Media & Document;

@Schema({
  timestamps: true,
  collection: 'media',
})
export class Media {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  path: string; // Ruta relativa: /uploads/images/filename.jpg

  @Prop({ required: true })
  url: string; // URL completa: http://backend:4000/uploads/images/filename.jpg

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number; // bytes

  @Prop()
  width?: number;

  @Prop()
  height?: number;

  @Prop({ default: 'image' })
  type: string; // 'image', 'video', 'document' (extensible)

  @Prop({ default: false })
  isPublic: boolean; // Si está en galería pública

  @Prop({ type: Types.ObjectId, ref: 'Album' })
  albumId?: Types.ObjectId; // Álbum al que pertenece (opcional)

  @Prop()
  alt?: string; // Texto alternativo

  @Prop()
  description?: string;

  @Prop({ default: 0 })
  order: number; // Orden dentro del álbum

  @Prop()
  orientation?: number; // Rotación adicional en grados: 0, 90, 180, 270
}

export const MediaSchema = SchemaFactory.createForClass(Media);

// Índices para mejorar el rendimiento
MediaSchema.index({ filename: 1 });
MediaSchema.index({ type: 1 });
MediaSchema.index({ isPublic: 1 });
MediaSchema.index({ albumId: 1 });
MediaSchema.index({ createdAt: -1 });
