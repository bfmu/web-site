import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HomepageConfigDocument = HomepageConfig & Document;

@Schema({ _id: false })
export class HomepageSectionConfig {
  @Prop({ required: true })
  id: string;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ default: 0 })
  order: number;

  @Prop({ type: Object, default: {} })
  config: Record<string, unknown>;
}

export const HomepageSectionConfigSchema = SchemaFactory.createForClass(HomepageSectionConfig);

@Schema({ timestamps: true, collection: 'homepage_config' })
export class HomepageConfig {
  @Prop({ type: [HomepageSectionConfigSchema], default: [] })
  sections: HomepageSectionConfig[];

  updatedAt?: Date;
  createdAt?: Date;
}

export const HomepageConfigSchema = SchemaFactory.createForClass(HomepageConfig);
