import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentExpirationService } from '../tasks/payment-expiration.service';
import { FilesModule } from '../files/files.module';
import { BookingSessionsController } from './booking-sessions.controller';
import { BookingSessionsService } from './booking-sessions.service';
import { AuditModule } from '../audit/audit.module';
import { BookingProgressService } from '../tasks/booking-progress.service';

@Module({
  imports: [ChatModule, NotificationsModule, FilesModule, AuditModule],
  controllers: [BookingsController, BookingSessionsController],
  providers: [
    BookingsService,
    BookingSessionsService,
    PaymentExpirationService,
    BookingProgressService,
  ],
  exports: [BookingsService, BookingSessionsService],
})
export class BookingsModule {}
