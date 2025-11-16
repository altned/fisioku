import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { BookingStatus } from '@prisma/client';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export class ListBookingsQueryDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @Transform(({ value }) => (value ? Number(value) : DEFAULT_PAGE))
  @IsInt()
  @Min(1)
  page: number = DEFAULT_PAGE;

  @Transform(({ value }) => (value ? Number(value) : DEFAULT_LIMIT))
  @IsInt()
  @Min(1)
  limit: number = DEFAULT_LIMIT;
}
