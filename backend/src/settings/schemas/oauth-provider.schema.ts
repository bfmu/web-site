import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OAuthProviderDocument = OAuthProvider & Document;

@Schema({ timestamps: true })
export class OAuthProvider {
  @Prop({ required: true, enum: ['google', 'github'], unique: true })
  provider: string;

  @Prop({ required: true })
  clientId: string;

  @Prop({ required: true })
  clientSecret: string; // Encriptado

  @Prop({ required: true })
  callbackUrl: string;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ default: 'database' })
  source: string; // 'database' | 'environment'

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OAuthProviderSchema = SchemaFactory.createForClass(OAuthProvider);
