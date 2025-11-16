import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingStatus, SessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService, BookingWithRelations } from '../bookings/bookings.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingProgressService {
  private readonly logger = new Logger(BookingProgressService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingsService: BookingsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleProgress() {
    await this.movePaidBookingsToInProgress();
    await this.completeFinishedBookings();
  }

  private async movePaidBookingsToInProgress() {
    const now = new Date();
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PAID,
        sessions: {
          some: {
            status: SessionStatus.SCHEDULED,
            scheduledAt: { lte: now },
          },
        },
      },
      select: { id: true },
    });

    for (const booking of bookings) {
      const updated = await this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.IN_PROGRESS },
        include: this.bookingsService.bookingRelations,
      });
      await this.notifyStatusChange(updated as BookingWithRelations);
    }

    if (bookings.length) {
      this.logger.log(`Moved ${bookings.length} bookings to IN_PROGRESS`);
    }
  }

  private async completeFinishedBookings() {
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: { in: [BookingStatus.PAID, BookingStatus.IN_PROGRESS] },
        sessions: {
          every: {
            status: SessionStatus.COMPLETED,
          },
        },
      },
      include: {
        sessions: true,
      },
    });

    for (const booking of bookings) {
      const updated = await this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.COMPLETED },
        include: this.bookingsService.bookingRelations,
      });
      await this.notifyStatusChange(updated as BookingWithRelations);
      await this.lockChatAfterCompletion(booking.id, booking.sessions);
    }

    if (bookings.length) {
      this.logger.log(`Marked ${bookings.length} bookings as COMPLETED`);
    }
  }

  private async lockChatAfterCompletion(
    bookingId: string,
    sessions: Array<{ completedAt: Date | null }>,
  ) {
    const timestamps = sessions
      .map((session) => session.completedAt?.getTime() ?? 0)
      .filter((value) => value > 0);
    if (!timestamps.length) {
      return;
    }
    const latest = new Date(Math.max(...timestamps));
    const lockAt = new Date(latest.getTime() + 24 * 60 * 60 * 1000);
    await this.prisma.chatThread.updateMany({
      where: { bookingId },
      data: { lockedAt: lockAt },
    });
  }

  private async notifyStatusChange(booking: BookingWithRelations) {
    const response = this.bookingsService.mapBookingResponse(booking);
    await this.notificationsService.notifyBookingStatusChange(response);
  }
}
