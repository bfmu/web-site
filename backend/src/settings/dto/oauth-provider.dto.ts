import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateOAuthProviderDto {
  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  clientSecret?: string;

  @IsString()
  @IsOptional()
  callbackUrl?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class OAuthProviderResponseDto {
  provider: string;
  clientId: string;
  callbackUrl: string;
  enabled: boolean;
  source: string;
  hasClientSecret?: boolean;
  updatedAt?: Date;
  createdAt?: Date;
}
