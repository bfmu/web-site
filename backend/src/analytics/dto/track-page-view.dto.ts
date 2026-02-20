import { IsString, IsOptional, MaxLength } from 'class-validator';

export class TrackPageViewDto {
  @IsString()
  @MaxLength(2048)
  path: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  referrer?: string;
}
