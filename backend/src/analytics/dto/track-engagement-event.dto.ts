import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { EngagementEventType } from '../schemas/engagement-event.schema';

export class TrackEngagementEventDto {
  @IsIn(['time_on_page', 'scroll_depth', 'click'])
  eventType: EngagementEventType;

  @IsString()
  @MaxLength(2048)
  path: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  value?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  label?: string;
}
