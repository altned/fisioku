import { BookingStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListAssignedBookingsQueryDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
