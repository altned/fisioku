import { IsDateString, IsOptional } from 'class-validator';

export class ListRevenueReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
