import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
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
import { AcceptConsentDto } from './dto/accept-consent.dto';
import type { Request } from 'express';
import { ListAssignedBookingsQueryDto } from './dto/list-assigned-bookings-query.dto';
import { TherapistCancelBookingDto } from './dto/therapist-cancel-booking.dto';

@Controller({
  path: 'bookings',
  version: '1',
})
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  listMine(@CurrentUser() user: ActiveUserData) {
    return this.bookingsService.listForPatient(user.id);
  }

  @Get('assigned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.THERAPIST)
  listAssigned(
    @CurrentUser() user: ActiveUserData,
    @Query(new ValidationPipe({ transform: true }))
    query: ListAssignedBookingsQueryDto,
  ) {
    return this.bookingsService.listForTherapist(user.id, query.status);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  create(@CurrentUser() user: ActiveUserData, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.id, dto);
  }

  @Patch(':bookingId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  cancel(
    @CurrentUser() user: ActiveUserData,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
  ) {
    return this.bookingsService.cancelByPatient(user.id, bookingId);
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

  @Patch(':bookingId/therapist-cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.THERAPIST)
  therapistCancel(
    @CurrentUser() user: ActiveUserData,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body() dto: TherapistCancelBookingDto,
  ) {
    return this.bookingsService.cancelByTherapist(
      user.id,
      bookingId,
      dto.reason,
    );
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

  @Post(':bookingId/consent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  @HttpCode(HttpStatus.CREATED)
  acceptConsent(
    @CurrentUser() user: ActiveUserData,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body() dto: AcceptConsentDto,
    @Req() req: Request,
  ) {
    return this.bookingsService.acceptConsent(
      user.id,
      bookingId,
      dto.textVersion,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }
}
