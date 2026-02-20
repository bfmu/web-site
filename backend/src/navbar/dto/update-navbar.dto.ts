import {
  IsArray,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class NavbarLinkDto {
  @ApiPropertyOptional()
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: '' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  external?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  openInNewTab?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ type: () => [NavbarLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NavbarLinkDto)
  children?: NavbarLinkDto[];
}

export class UpdateNavbarDto {
  @ApiPropertyOptional({ type: [NavbarLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NavbarLinkDto)
  links?: NavbarLinkDto[];
}
