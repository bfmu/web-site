import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({
  timestamps: true,
  collection: 'posts',
})
export class Post {
  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string; // Markdown content

  @Prop()
  description: string;

  @Prop()
  image: string;

  @Prop([String])
  tags: string[];

  @Prop()
  category: string;

  @Prop({ default: false })
  draft: boolean;

  @Prop({ required: true })
  published: Date;

  @Prop({ default: 'es' })
  language: string;

  @Prop({ default: 0 })
  readingTime: number;

  @Prop({ default: 0 })
  views: number;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Índices para mejorar el rendimiento de las consultas
PostSchema.index({ slug: 1 });
PostSchema.index({ published: -1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ category: 1 });
PostSchema.index({ draft: 1 });
PostSchema.index({ language: 1 });
