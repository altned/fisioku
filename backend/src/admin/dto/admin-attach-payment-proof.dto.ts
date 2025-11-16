import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class AdminAttachPaymentProofDto {
  @IsUUID()
  fileId: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}
