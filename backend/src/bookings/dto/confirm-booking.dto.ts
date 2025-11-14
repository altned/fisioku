import { IsBoolean } from 'class-validator';

export class ConfirmBookingDto {
  @IsBoolean()
  accept: boolean;
}
