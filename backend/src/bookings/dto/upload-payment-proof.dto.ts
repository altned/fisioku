import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsOptional, IsUrl } from 'class-validator';

export class UploadPaymentProofDto {
  @IsUrl()
  proofUrl: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}
