import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  PaymentStatus,
  Prisma,
  SessionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
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
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import { ListRevenueReportQueryDto } from './dto/list-revenue-report-query.dto';
import { ListAvailabilityReportQueryDto } from './dto/list-availability-report-query.dto';

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
          patientAddress: true,
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
    const therapistShareRate = this.normalizeTherapistSharePercentage(
      dto.therapistSharePercentage,
    );
    return this.prisma.therapyPackage.create({
      data: {
        name: dto.name,
        description: dto.description,
        sessionCount: dto.sessionCount,
        price: dto.price,
        defaultExpiryDays: dto.defaultExpiryDays,
        isActive: dto.isActive ?? true,
        therapistShareRate,
      },
    });
  }

  listPackages() {
    return this.prisma.therapyPackage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  updatePackage(id: string, dto: UpdatePackageDto) {
    const { isActive, therapistSharePercentage, ...rest } = dto;
    const data: Prisma.TherapyPackageUpdateInput = {
      ...rest,
      ...(isActive !== undefined ? { isActive } : {}),
    };

    if (therapistSharePercentage !== undefined) {
      data.therapistShareRate = this.normalizeTherapistSharePercentage(
        therapistSharePercentage,
      );
    }

    return this.prisma.therapyPackage.update({
      where: { id },
      data,
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

  private normalizeTherapistSharePercentage(value: number) {
    if (Number.isNaN(value) || value < 10 || value > 100) {
      throw new BadRequestException(
        'Therapist share percentage must be between 10 and 100.',
      );
    }
    const rate = value / 100;
    return new Prisma.Decimal(rate.toFixed(4));
  }

  async listReviews(query: ListReviewsQueryDto) {
    const where: Prisma.ReviewWhereInput = {};
    if (query.search) {
      where.OR = [
        {
          therapist: {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              {
                therapistProfile: {
                  fullName: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          },
        },
        {
          patient: {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              {
                patientProfile: {
                  fullName: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          },
        },
      ];
    }

    if (query.minRating !== undefined || query.maxRating !== undefined) {
      where.rating = {
        ...(query.minRating !== undefined ? { gte: query.minRating } : {}),
        ...(query.maxRating !== undefined ? { lte: query.maxRating } : {}),
      };
    }

    const [reviews, summary] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          patient: {
            select: { email: true, patientProfile: { select: { fullName: true } } },
          },
          therapist: {
            select: {
              email: true,
              therapistProfile: { select: { fullName: true } },
            },
          },
        },
      }),
      this.prisma.reviewSummary.findMany({
        orderBy: { averageRating: 'desc' },
        take: 10,
        include: {
          therapist: {
            select: {
              email: true,
              therapistProfile: { select: { fullName: true } },
            },
          },
        },
      }),
    ]);

    return {
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        therapistName:
          review.therapist.therapistProfile?.fullName ?? review.therapist.email,
        patientName:
          review.patient.patientProfile?.fullName ?? review.patient.email,
      })),
      summary: summary.map((item) => ({
        therapistId: item.therapistId,
        therapistName: item.therapist.therapistProfile?.fullName ?? null,
        therapistEmail: item.therapist.email,
        averageRating: item.averageRating,
        reviewCount: item.reviewCount,
      })),
    };
  }

  async getTherapistRevenueReport(query: ListRevenueReportQueryDto) {
    const start = query.startDate ? new Date(query.startDate) : undefined;
    const end = query.endDate ? new Date(query.endDate) : undefined;

    if (start && Number.isNaN(start.getTime())) {
      throw new BadRequestException('startDate is invalid');
    }
    if (end && Number.isNaN(end.getTime())) {
      throw new BadRequestException('endDate is invalid');
    }
    if (start && end && start.getTime() > end.getTime()) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const where: Prisma.PaymentWhereInput = {
      status: PaymentStatus.VERIFIED,
    };
    if (start || end) {
      where.verifiedAt = {};
      if (start) {
        where.verifiedAt.gte = start;
      }
      if (end) {
        where.verifiedAt.lte = end;
      }
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        booking: {
          include: {
            therapist: {
              select: {
                id: true,
                email: true,
                therapistProfile: { select: { fullName: true } },
              },
            },
          },
        },
      },
    });

    const map: Record<
      string,
      {
        therapistId: string;
        therapistName: string | null;
        therapistEmail: string;
        totalRevenue: number;
        therapistShare: number;
        platformFee: number;
        bookingCount: number;
      }
    > = {};
    let totalRevenue = 0;
    let totalTherapistShare = 0;
    let totalPlatformFee = 0;

    for (const payment of payments) {
      const therapist = payment.booking?.therapist;
      if (!therapist) {
        continue;
      }
      const therapistId = therapist.id;
      if (!map[therapistId]) {
        map[therapistId] = {
          therapistId,
          therapistName: therapist.therapistProfile?.fullName ?? null,
          therapistEmail: therapist.email,
          totalRevenue: 0,
          therapistShare: 0,
          platformFee: 0,
          bookingCount: 0,
        };
      }
      const row = map[therapistId];
      const amount = Number(payment.amount);
      const therapistShareAmount = Number(payment.therapistShareAmount ?? 0);
      const platformFeeAmount = Number(payment.platformFeeAmount ?? 0);
      row.totalRevenue += amount;
      row.therapistShare += therapistShareAmount;
      row.platformFee += platformFeeAmount;
      row.bookingCount += 1;
      totalRevenue += amount;
      totalTherapistShare += therapistShareAmount;
      totalPlatformFee += platformFeeAmount;
    }

    const rows = Object.values(map).sort(
      (a, b) => b.totalRevenue - a.totalRevenue,
    );

    return {
      rows: rows.map((row) => ({
        therapistId: row.therapistId,
        therapistName: row.therapistName,
        therapistEmail: row.therapistEmail,
        totalRevenue: row.totalRevenue,
        therapistShare: row.therapistShare,
        platformFee: row.platformFee,
        bookingCount: row.bookingCount,
      })),
      totals: {
        totalRevenue,
        totalTherapistShare,
        totalPlatformFee,
      },
    };
  }

  async getTherapistAvailabilityReport(
    query: ListAvailabilityReportQueryDto,
  ) {
    const defaultRangeDays = 7;
    const now = new Date();
    const start = query.startDate ? new Date(query.startDate) : now;
    const end = query.endDate
      ? new Date(query.endDate)
      : new Date(now.getTime() + defaultRangeDays * 24 * 60 * 60 * 1000);

    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('startDate is invalid');
    }
    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException('endDate is invalid');
    }
    if (start.getTime() > end.getTime()) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const availabilities = await this.prisma.therapistAvailability.findMany({
      where: {
        startTime: { gte: start },
        endTime: { lte: end },
      },
      include: {
        therapist: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                therapistProfile: { select: { fullName: true } },
              },
            },
          },
        },
      },
    });

    const sessions = await this.prisma.bookingSession.findMany({
      where: {
        scheduledAt: {
          gte: start,
          lte: end,
        },
        status: { not: SessionStatus.CANCELLED },
        booking: {
          status: { in: [
            BookingStatus.WAITING_THERAPIST_CONFIRM,
            BookingStatus.PAYMENT_PENDING,
            BookingStatus.WAITING_ADMIN_VERIFY_PAYMENT,
            BookingStatus.PAID,
            BookingStatus.IN_PROGRESS,
          ]},
        },
      },
      include: {
        booking: {
          select: {
            therapistId: true,
            therapist: {
              select: {
                email: true,
                therapistProfile: { select: { fullName: true } },
              },
            },
          },
        },
      },
    });

    const map: Record<
      string,
      {
        therapistId: string;
        therapistName: string | null;
        therapistEmail: string;
        availabilityCount: number;
        scheduledCount: number;
      }
    > = {};

    for (const availability of availabilities) {
      const therapistId = availability.therapist.user.id;
      if (!map[therapistId]) {
        map[therapistId] = {
          therapistId,
          therapistName:
            availability.therapist.user.therapistProfile?.fullName ?? null,
          therapistEmail: availability.therapist.user.email,
          availabilityCount: 0,
          scheduledCount: 0,
        };
      }
      map[therapistId].availabilityCount += 1;
    }

    for (const session of sessions) {
      const therapistId = session.booking.therapistId;
      if (!therapistId) {
        continue;
      }
      if (!map[therapistId]) {
        map[therapistId] = {
          therapistId,
          therapistName:
            session.booking.therapist?.therapistProfile?.fullName ?? null,
          therapistEmail: session.booking.therapist?.email ?? '',
          availabilityCount: 0,
          scheduledCount: 0,
        };
      }
      map[therapistId].scheduledCount += 1;
    }

    const rows = Object.values(map).sort(
      (a, b) => b.availabilityCount - a.availabilityCount,
    );

    return {
      range: {
        start,
        end,
      },
      rows: rows.map((row) => {
        const remaining =
          row.availabilityCount > row.scheduledCount
            ? row.availabilityCount - row.scheduledCount
            : 0;
        return {
          therapistId: row.therapistId,
          therapistName: row.therapistName,
          therapistEmail: row.therapistEmail,
          availabilityCount: row.availabilityCount,
          scheduledCount: row.scheduledCount,
          remainingSlots: remaining,
        };
      }),
    };
  }
}
