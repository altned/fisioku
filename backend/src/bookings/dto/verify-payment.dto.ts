import { IsBoolean } from 'class-validator';

export class VerifyPaymentDto {
  @IsBoolean()
  approved: boolean;
}
