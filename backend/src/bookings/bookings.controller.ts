import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { RolesGuard } from '../common/guards/roles.guard';
import { ConfirmBookingDto } from './dto/confirm-booking.dto';
import { UploadPaymentProofDto } from './dto/upload-payment-proof.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Controller({
  path: 'bookings',
  version: '1',
})
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  create(@CurrentUser() user: ActiveUserData, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.id, dto);
  }

  @Patch(':bookingId/therapist-confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.THERAPIST)
  therapistConfirm(
    @CurrentUser() user: ActiveUserData,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body() dto: ConfirmBookingDto,
  ) {
    return this.bookingsService.confirmByTherapist(user.id, bookingId, dto);
  }

  @Patch(':bookingId/payment-proof')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  uploadPaymentProof(
    @CurrentUser() user: ActiveUserData,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body() dto: UploadPaymentProofDto,
  ) {
    return this.bookingsService.uploadPaymentProof(user.id, bookingId, dto);
  }

  @Patch(':bookingId/payment/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  verifyPayment(
    @CurrentUser() user: ActiveUserData,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.bookingsService.verifyPayment(user.id, bookingId, dto);
  }
}
