import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { BookingsModule } from '../bookings/bookings.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [BookingsModule, AuditModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
