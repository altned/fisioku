import { IsDateString, IsOptional } from 'class-validator';

export class ListAvailabilityReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
