import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  therapistId: string;

  @IsUUID()
  packageId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notesFromPatient?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painLevel?: number;

  @IsDateString()
  preferredSchedule: string;

  @IsBoolean()
  consentAccepted: boolean;
}
