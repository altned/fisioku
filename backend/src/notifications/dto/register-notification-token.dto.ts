import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterNotificationTokenDto {
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  platform?: string;
}
