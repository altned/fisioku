import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, IsPositive } from 'class-validator';

export class ListAuditLogsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit = 20;

  @IsOptional()
  @IsString()
  action?: string;
}
