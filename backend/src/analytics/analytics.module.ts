import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PageView, PageViewSchema } from './schemas/page-view.schema';
import {
  EngagementEvent,
  EngagementEventSchema,
} from './schemas/engagement-event.schema';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PageView.name, schema: PageViewSchema },
      { name: EngagementEvent.name, schema: EngagementEventSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
