import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EngagementEventType = 'time_on_page' | 'scroll_depth' | 'click';

export type EngagementEventDocument = EngagementEvent & Document;

@Schema({
  timestamps: true,
  collection: 'engagement_events',
})
export class EngagementEvent {
  @Prop({ required: true, enum: ['time_on_page', 'scroll_depth', 'click'] })
  eventType: EngagementEventType;

  @Prop({ required: true })
  path: string;

  @Prop()
  sessionId?: string;

  @Prop({ type: Number })
  value?: number;

  @Prop()
  label?: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const EngagementEventSchema =
  SchemaFactory.createForClass(EngagementEvent);

EngagementEventSchema.index({ path: 1, eventType: 1 });
EngagementEventSchema.index({ sessionId: 1, createdAt: 1 });
EngagementEventSchema.index({ createdAt: -1 });
