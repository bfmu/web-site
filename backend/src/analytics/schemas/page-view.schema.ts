import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PageViewDocument = PageView & Document;

@Schema({
  timestamps: true,
  collection: 'page_views',
})
export class PageView {
  @Prop({ required: true })
  path: string;

  @Prop({ required: true })
  ip: string;

  @Prop()
  userAgent?: string;

  @Prop()
  referrer?: string;

  @Prop()
  country?: string;

  @Prop()
  city?: string;

  @Prop()
  postSlug?: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const PageViewSchema = SchemaFactory.createForClass(PageView);

PageViewSchema.index({ path: 1 });
PageViewSchema.index({ ip: 1 });
PageViewSchema.index({ createdAt: -1 });
PageViewSchema.index({ country: 1, city: 1 });
