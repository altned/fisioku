import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterNotificationTokenDto } from './dto/register-notification-token.dto';
import { FirebaseAdminService } from './firebase-admin.service';
import { BookingResponse } from '../bookings/interfaces/booking-response.interface';
import { ChatThread } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {}

  async registerDeviceToken(userId: string, dto: RegisterNotificationTokenDto) {
    return this.prisma.notificationToken.upsert({
      where: { token: dto.token },
      update: { userId, platform: dto.platform },
      create: {
        token: dto.token,
        userId,
        platform: dto.platform,
      },
    });
  }

  async removeDeviceToken(userId: string, token: string) {
    await this.prisma.notificationToken.deleteMany({
      where: {
        token,
        userId,
      },
    });
  }

  async notifyBookingStatusChange(booking: BookingResponse) {
    const messaging = this.firebaseAdminService.messaging;
    if (!messaging) {
      this.logger.debug(
        `Skipping notification for booking ${booking.id}; Firebase not configured.`,
      );
      return;
    }

    const userIds = [booking.patientId, booking.therapist.id];
    const tokens = await this.prisma.notificationToken.findMany({
      where: {
        userId: { in: userIds },
      },
    });

    if (!tokens.length) {
      return;
    }

    const payload = {
      notification: {
        title: 'Status Booking Diperbarui',
        body: `Booking ${booking.package.name} kini ${booking.status}`,
      },
      data: {
        bookingId: booking.id,
        status: booking.status,
      },
    };

    try {
      await messaging.sendEachForMulticast({
        tokens: tokens.map((t) => t.token),
        ...payload,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send notification for booking ${booking.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async notifyChatMessage(
    thread: ChatThread,
    senderId: string,
    message: string,
  ) {
    const messaging = this.firebaseAdminService.messaging;
    if (!messaging) {
      this.logger.debug(
        `Skipping chat notification; Firebase not configured.`,
      );
      return;
    }
    const recipients = [thread.patientId, thread.therapistId].filter(
      (id) => id !== senderId,
    );
    if (!recipients.length) {
      return;
    }
    const tokens = await this.prisma.notificationToken.findMany({
      where: { userId: { in: recipients } },
    });
    if (!tokens.length) {
      return;
    }
    const preview =
      message.length > 80 ? `${message.slice(0, 77)}...` : message;
    try {
      await messaging.sendEachForMulticast({
        tokens: tokens.map((token) => token.token),
        notification: {
          title: 'Pesan Baru',
          body: preview,
        },
        data: {
          type: 'chat_message',
          bookingId: thread.bookingId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send chat notification for booking ${thread.bookingId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
