import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, SessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ScheduleSessionDto } from './dto/schedule-session.dto';

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.WAITING_THERAPIST_CONFIRM,
  BookingStatus.PAYMENT_PENDING,
  BookingStatus.WAITING_ADMIN_VERIFY_PAYMENT,
  BookingStatus.PAID,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];

@Injectable()
export class BookingSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async scheduleSession(
    therapistId: string,
    sessionId: string,
    dto: ScheduleSessionDto,
  ) {
    const session = await this.prisma.bookingSession.findUnique({
      where: { id: sessionId },
      include: { booking: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    if (session.booking.therapistId !== therapistId) {
      throw new ForbiddenException('You cannot edit this session.');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Schedule time is invalid.');
    }

    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Schedule must be in the future.');
    }

    await this.ensureTherapistAvailability(
      session.booking.therapistId,
      scheduledAt,
      sessionId,
    );

    const updated = await this.prisma.bookingSession.update({
      where: { id: sessionId },
      data: {
        scheduledAt,
        status: SessionStatus.SCHEDULED,
      },
    });

    await this.auditService.record({
      action: 'SESSION_SCHEDULED',
      actorId: therapistId,
      targetType: 'booking_session',
      targetId: sessionId,
      metadata: {
        scheduledAt: scheduledAt.toISOString(),
      },
    });

    return updated;
  }

  async completeSession(therapistId: string, sessionId: string) {
    const session = await this.prisma.bookingSession.findUnique({
      where: { id: sessionId },
      include: { booking: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    if (session.booking.therapistId !== therapistId) {
      throw new ForbiddenException('You cannot complete this session.');
    }

    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Session must be scheduled before completion.');
    }

    if (!session.scheduledAt) {
      throw new BadRequestException('Session does not have a schedule yet.');
    }

    const updated = await this.prisma.bookingSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await this.auditService.record({
      action: 'SESSION_COMPLETED',
      actorId: therapistId,
      targetType: 'booking_session',
      targetId: sessionId,
      metadata: {
        completedAt: updated.completedAt?.toISOString() ?? null,
      },
    });

    return updated;
  }

  async scheduleSessionAsAdmin(
    adminId: string,
    sessionId: string,
    dto: ScheduleSessionDto,
  ) {
    const session = await this.prisma.bookingSession.findUnique({
      where: { id: sessionId },
      include: { booking: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    if (session.booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Booking already completed.');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Schedule time is invalid.');
    }

    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Schedule must be in the future.');
    }

    await this.ensureTherapistAvailability(
      session.booking.therapistId,
      scheduledAt,
      sessionId,
    );

    const updated = await this.prisma.bookingSession.update({
      where: { id: sessionId },
      data: {
        scheduledAt,
        status: SessionStatus.SCHEDULED,
      },
    });

    await this.auditService.record({
      action: 'SESSION_ADMIN_OVERRIDDEN',
      actorId: adminId,
      targetType: 'booking_session',
      targetId: sessionId,
      metadata: {
        scheduledAt: scheduledAt.toISOString(),
        previousScheduledAt: session.scheduledAt?.toISOString() ?? null,
      },
    });

    return updated;
  }

  private async ensureTherapistAvailability(
    therapistId: string,
    scheduledAt: Date,
    sessionId: string,
  ) {
    const availability = await this.prisma.therapistAvailability.findFirst({
      where: {
        therapistId,
        startTime: { lte: scheduledAt },
        endTime: { gt: scheduledAt },
      },
    });

    if (!availability) {
      throw new BadRequestException(
        'Therapist is not available at the selected time.',
      );
    }

    const conflictingSession = await this.prisma.bookingSession.findFirst({
      where: {
        id: { not: sessionId },
        booking: {
          therapistId,
          status: { in: ACTIVE_BOOKING_STATUSES },
        },
        status: { not: SessionStatus.CANCELLED },
        scheduledAt: {
          gte: availability.startTime,
          lt: availability.endTime,
        },
      },
    });

    if (conflictingSession) {
      throw new BadRequestException(
        'Therapist already has another booking near that time.',
      );
    }
  }
}
