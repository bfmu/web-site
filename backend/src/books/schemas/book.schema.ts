import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BookDocument = Book & Document;

@Schema({ timestamps: true, collection: 'books' })
export class Book {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  author: string;

  @Prop()
  cover: string;

  @Prop()
  readAt: Date;

  @Prop({ min: 1, max: 5 })
  rating: number;

  @Prop()
  postSlug: string;
}

export const BookSchema = SchemaFactory.createForClass(Book);

BookSchema.index({ readAt: -1 });
