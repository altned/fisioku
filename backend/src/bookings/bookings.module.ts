import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentExpirationService } from '../tasks/payment-expiration.service';

@Module({
  imports: [ChatModule, NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService, PaymentExpirationService],
  exports: [BookingsService],
})
export class BookingsModule {}
