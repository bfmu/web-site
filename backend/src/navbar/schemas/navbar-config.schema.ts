import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NavbarConfigDocument = NavbarConfig & Document;

@Schema({ _id: false })
export class NavbarLinkSchema {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  url: string;

  @Prop({ default: false })
  external?: boolean;

  @Prop({ default: false })
  openInNewTab?: boolean;

  @Prop({ default: 0 })
  order?: number;

  @Prop({ type: [Object], default: [] })
  children?: Array<{
    name: string;
    url: string;
    external?: boolean;
    openInNewTab?: boolean;
    order?: number;
    children?: Array<Record<string, unknown>>;
  }>;
}

export const NavbarLinkSchemaDoc =
  SchemaFactory.createForClass(NavbarLinkSchema);

@Schema({ timestamps: true, collection: 'navbar_config' })
export class NavbarConfig {
  @Prop({ type: [NavbarLinkSchemaDoc], default: [] })
  links: NavbarLinkSchema[];

  updatedAt?: Date;
  createdAt?: Date;
}

export const NavbarConfigSchema = SchemaFactory.createForClass(NavbarConfig);
