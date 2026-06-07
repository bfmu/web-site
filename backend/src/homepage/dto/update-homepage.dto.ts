import {
  IsArray,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class HomepageSectionDto {
  @ApiPropertyOptional()
  @IsString()
  id: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpdateHomepageDto {
  @ApiPropertyOptional({ type: [HomepageSectionDto] })
  @IsOptional()
  @IsArray()
  @Type(() => HomepageSectionDto)
  sections?: HomepageSectionDto[];
}
