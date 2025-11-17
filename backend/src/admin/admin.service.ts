import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, PaymentStatus, Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { AdminAttachPaymentProofDto } from './dto/admin-attach-payment-proof.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { BookingsService } from '../bookings/bookings.service';
import { BookingSessionsService } from '../bookings/booking-sessions.service';
import { ScheduleSessionDto } from '../bookings/dto/schedule-session.dto';
import { AuditService } from '../audit/audit.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingsService: BookingsService,
    private readonly bookingSessionsService: BookingSessionsService,
    private readonly auditService: AuditService,
  ) {}

  async getSummary() {
    const [bookingCounts, paymentAgg, activeTherapists, pendingPayments] =
      await this.prisma.$transaction([
        this.prisma.booking.groupBy({
          by: ['status'],
          orderBy: { status: 'asc' },
          _count: { _all: true },
        }),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: PaymentStatus.VERIFIED },
        }),
        this.prisma.user.count({
          where: { role: 'THERAPIST', status: 'ACTIVE' },
        }),
        this.prisma.booking.count({
          where: { status: BookingStatus.WAITING_ADMIN_VERIFY_PAYMENT },
        }),
      ]);

    const bookingStatusCounts: Partial<Record<BookingStatus, number>> = {};
    const typedCounts = bookingCounts as Array<{
      status: BookingStatus;
      _count: { _all: number | null };
    }>;
    for (const group of typedCounts) {
      const count = group._count._all ?? 0;
      bookingStatusCounts[group.status] = count;
    }

    return {
      bookingStatusCounts,
      totalRevenue: paymentAgg._sum.amount?.toString() ?? '0',
      activeTherapists,
      pendingPayments,
    };
  }

  async listBookings(query: ListBookingsQueryDto) {
    const { page, limit, status } = query;
    const where: Prisma.BookingWhereInput = {};
    if (status) {
      where.status = status;
    }
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        include: {
          patient: { select: { id: true, email: true, patientProfile: true } },
          therapist: {
            select: { id: true, email: true, therapistProfile: true },
          },
          package: true,
          payment: true,
          sessions: { include: { note: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    const therapistIds = items.map((booking) => booking.therapistId);
    const ratingMap: Record<
      string,
      { averageRating: number | null; reviewCount: number }
    > = {};
    if (therapistIds.length) {
      const aggregates = await this.prisma.review.groupBy({
        by: ['therapistId'],
        where: { therapistId: { in: therapistIds } },
        _avg: { rating: true },
        _count: { _all: true },
      });
      for (const aggregate of aggregates) {
        ratingMap[aggregate.therapistId] = {
          averageRating: aggregate._avg.rating ?? null,
          reviewCount: aggregate._count._all ?? 0,
        };
      }
    }

    const enriched = items.map((booking) => ({
      ...booking,
      therapist: {
        ...booking.therapist,
        averageRating: ratingMap[booking.therapistId]?.averageRating ?? null,
        reviewCount: ratingMap[booking.therapistId]?.reviewCount ?? 0,
      },
    }));

    return {
      data: enriched,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  createPackage(dto: CreatePackageDto) {
    return this.prisma.therapyPackage.create({
      data: {
        name: dto.name,
        description: dto.description,
        sessionCount: dto.sessionCount,
        price: dto.price,
        defaultExpiryDays: dto.defaultExpiryDays,
        isActive: dto.isActive ?? true,
      },
    });
  }

  listPackages() {
    return this.prisma.therapyPackage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  updatePackage(id: string, dto: UpdatePackageDto) {
    const { isActive, ...rest } = dto;
    return this.prisma.therapyPackage.update({
      where: { id },
      data: {
        ...rest,
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
  }

  togglePackage(id: string, isActive: boolean) {
    return this.prisma.therapyPackage.update({
      where: { id },
      data: { isActive },
    });
  }

  async cancelBooking(adminId: string, bookingId: string, dto: CancelBookingDto) {
    const response = await this.bookingsService.cancelByAdmin(bookingId);
    await this.auditService.record({
      action: 'BOOKING_FORCE_CANCEL',
      actorId: adminId,
      targetType: 'booking',
      targetId: bookingId,
      metadata: {
        reason: dto.reason ?? null,
      },
    });
    return response;
  }

  async overrideSessionSchedule(
    adminId: string,
    bookingId: string,
    sessionId: string,
    dto: ScheduleSessionDto,
  ) {
    const session = await this.prisma.bookingSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.bookingId !== bookingId) {
      throw new NotFoundException('Session not found for this booking.');
    }

    return this.bookingSessionsService.scheduleSessionAsAdmin(
      adminId,
      sessionId,
      dto,
    );
  }

  async attachPaymentProof(
    adminId: string,
    bookingId: string,
    dto: AdminAttachPaymentProofDto,
  ) {
    const response = await this.bookingsService.attachPaymentProofByAdmin(
      adminId,
      bookingId,
      dto,
    );
    await this.auditService.record({
      action: 'BOOKING_PAYMENT_PROOF_ATTACHED',
      actorId: adminId,
      targetType: 'booking',
      targetId: bookingId,
      metadata: { fileId: dto.fileId },
    });
    return response;
  }

  async listAuditLogs(query: ListAuditLogsQueryDto) {
    const { page, limit, action } = query;
    const where: Prisma.AuditLogWhereInput = {};
    if (action) {
      where.action = action;
    }
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async listChatMessages(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: { bookingId },
      orderBy: { sentAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            patientProfile: { select: { fullName: true } },
            therapistProfile: { select: { fullName: true } },
          },
        },
      },
    });

    return messages.map((message) => ({
      id: message.id,
      message: message.message,
      sentAt: message.sentAt,
      sender: {
        id: message.senderId,
        email: message.sender.email,
        name:
          message.sender.patientProfile?.fullName ??
          message.sender.therapistProfile?.fullName ??
          message.sender.email,
      },
    }));
  }

  async listUsers(query: ListUsersQueryDto) {
    const { role, status, page, limit, search } = query;
    const where: Prisma.UserWhereInput = {};
    if (role) {
      where.role = role;
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        {
          patientProfile: {
            fullName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          therapistProfile: {
            fullName: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: {
          patientProfile: true,
          therapistProfile: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async updateUserStatus(
    adminId: string,
    userId: string,
    dto: UpdateUserStatusDto,
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status },
    });

    await this.auditService.record({
      action: 'USER_STATUS_UPDATED',
      actorId: adminId,
      targetType: 'user',
      targetId: userId,
      metadata: { status: dto.status },
    });

    return user;
  }
}
