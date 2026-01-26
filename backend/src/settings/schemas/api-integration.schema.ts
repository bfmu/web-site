import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ApiIntegrationDocument = ApiIntegration & Document;

@Schema({ timestamps: true })
export class ApiIntegration {
  @Prop({ required: true, enum: ['spotify'], unique: true })
  service: string;

  @Prop({ required: true })
  clientId: string;

  @Prop({ required: true })
  clientSecret: string; // Encriptado

  @Prop()
  refreshToken: string; // Encriptado

  @Prop({ required: true })
  redirectUri: string;

  @Prop({ type: [String], default: [] })
  scopes: string[];

  @Prop({ default: true })
  enabled: boolean;

  @Prop()
  lastTokenRefresh: Date;

  @Prop({ default: 'valid', enum: ['valid', 'expired', 'invalid'] })
  tokenStatus: string;

  @Prop({ default: 'database' })
  source: string; // 'database' | 'environment'

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ApiIntegrationSchema = SchemaFactory.createForClass(ApiIntegration);
