import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  password?: string; // Opcional para OAuth users

  @Prop({ required: true })
  name: string;

  @Prop()
  avatar?: string;

  @Prop({ enum: ['local', 'google', 'github'], default: 'local' })
  provider: string;

  @Prop()
  providerId?: string;

  @Prop({ enum: ['admin', 'editor', 'user'], default: 'user' })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  refreshToken?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Índices
UserSchema.index({ email: 1 });
UserSchema.index({ provider: 1, providerId: 1 });
