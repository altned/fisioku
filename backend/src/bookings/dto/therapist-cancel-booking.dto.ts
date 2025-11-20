import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TherapistCancelBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

