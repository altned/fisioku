import { IsString, MinLength } from 'class-validator';

export class AcceptConsentDto {
  @IsString()
  @MinLength(10)
  textVersion: string;
}
