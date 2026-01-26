import { IsString, IsBoolean, IsOptional, IsArray } from 'class-validator';

export class UpdateApiIntegrationDto {
  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  clientSecret?: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsString()
  @IsOptional()
  redirectUri?: string;

  @IsArray()
  @IsOptional()
  scopes?: string[];

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class ApiIntegrationResponseDto {
  service: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  enabled: boolean;
  lastTokenRefresh?: Date;
  tokenStatus: string;
  source: string;
  updatedAt?: Date;
  createdAt?: Date;
}
