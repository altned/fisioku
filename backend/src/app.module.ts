import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { TherapistsModule } from './therapists/therapists.module';
import { BookingsModule } from './bookings/bookings.module';
import { RolesGuard } from './common/guards/roles.guard';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SessionNotesModule } from './session-notes/session-notes.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';
import { ScheduleModule } from '@nestjs/schedule';
import { FilesModule } from './files/files.module';
import { PackagesModule } from './packages/packages.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    TherapistsModule,
    BookingsModule,
    ChatModule,
    NotificationsModule,
    SessionNotesModule,
    ReviewsModule,
    AdminModule,
    FilesModule,
    PackagesModule,
  ],
  controllers: [AppController],
  providers: [RolesGuard],
})
export class AppModule {}
