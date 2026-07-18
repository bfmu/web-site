import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ToggleLikeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  visitorId: string;
}
