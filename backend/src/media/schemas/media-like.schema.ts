import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MediaLikeDocument = MediaLike & Document;

@Schema({
  timestamps: true,
  collection: 'media_likes',
})
export class MediaLike {
  @Prop({ type: Types.ObjectId, ref: 'Media', required: true })
  mediaId: Types.ObjectId;

  @Prop({ required: true })
  visitorId: string;
}

export const MediaLikeSchema = SchemaFactory.createForClass(MediaLike);

// Un visitante solo puede dar like una vez por imagen
MediaLikeSchema.index({ mediaId: 1, visitorId: 1 }, { unique: true });
