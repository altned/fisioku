import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { TogglePackageDto } from './dto/toggle-package.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { AdminAttachPaymentProofDto } from './dto/admin-attach-payment-proof.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { ScheduleSessionDto } from '../bookings/dto/schedule-session.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import { ListRevenueReportQueryDto } from './dto/list-revenue-report-query.dto';
import { ListAvailabilityReportQueryDto } from './dto/list-availability-report-query.dto';

@Controller({
  path: 'admin',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('summary')
  getSummary() {
    return this.adminService.getSummary();
  }

  @Get('bookings')
  listBookings(@Query() query: ListBookingsQueryDto) {
    return this.adminService.listBookings(query);
  }

  @Post('packages')
  createPackage(@Body() dto: CreatePackageDto) {
    return this.adminService.createPackage(dto);
  }

  @Get('packages')
  listPackages() {
    return this.adminService.listPackages();
  }

  @Patch('packages/:id')
  updatePackage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePackageDto,
  ) {
    return this.adminService.updatePackage(id, dto);
  }

  @Patch('packages/:id/toggle')
  togglePackage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: TogglePackageDto,
  ) {
    return this.adminService.togglePackage(id, dto.isActive);
  }

  @Patch('bookings/:bookingId/cancel')
  cancelBooking(
    @CurrentUser() user: ActiveUserData,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.adminService.cancelBooking(user.id, bookingId, dto);
  }

  @Patch('bookings/:bookingId/payment-proof')
  attachPaymentProof(
    @CurrentUser() user: ActiveUserData,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body() dto: AdminAttachPaymentProofDto,
  ) {
    return this.adminService.attachPaymentProof(user.id, bookingId, dto);
  }

  @Patch('bookings/:bookingId/sessions/:sessionId/schedule')
  overrideSessionSchedule(
    @CurrentUser() user: ActiveUserData,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Body() dto: ScheduleSessionDto,
  ) {
    return this.adminService.overrideSessionSchedule(
      user.id,
      bookingId,
      sessionId,
      dto,
    );
  }

  @Get('audit-logs')
  listAuditLogs(@Query() query: ListAuditLogsQueryDto) {
    return this.adminService.listAuditLogs(query);
  }

  @Get('bookings/:bookingId/chat-messages')
  listChatMessages(
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
  ) {
    return this.adminService.listChatMessages(bookingId);
  }

  @Get('users')
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Patch('users/:userId/status')
  updateUserStatus(
    @CurrentUser() user: ActiveUserData,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(user.id, userId, dto);
  }

  @Get('reviews')
  listReviews(@Query() query: ListReviewsQueryDto) {
    return this.adminService.listReviews(query);
  }

  @Get('reports/therapist-revenue')
  getTherapistRevenueReport(
    @Query() query: ListRevenueReportQueryDto,
  ) {
    return this.adminService.getTherapistRevenueReport(query);
  }

  @Get('reports/therapist-availability')
  getTherapistAvailabilityReport(
    @Query() query: ListAvailabilityReportQueryDto,
  ) {
    return this.adminService.getTherapistAvailabilityReport(query);
  }
}
