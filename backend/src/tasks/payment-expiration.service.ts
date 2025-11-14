import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';
import { BookingsService } from '../bookings/bookings.service';

@Injectable()
export class PaymentExpirationService {
  private readonly logger = new Logger(PaymentExpirationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiration() {
    const now = new Date();
    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PAYMENT_PENDING,
        paymentDueAt: { lt: now },
      },
      select: { id: true },
    });

    for (const booking of expiredBookings) {
      await this.bookingsService.expirePayment(booking.id);
    }

    if (expiredBookings.length) {
      this.logger.log(
        `Expired ${expiredBookings.length} bookings due to payment timeout`,
      );
    }
  }
}
