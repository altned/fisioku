import { Body, Controller, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { BookingSessionsService } from './booking-sessions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { ScheduleSessionDto } from './dto/schedule-session.dto';

@Controller({
  path: 'booking-sessions',
  version: '1',
})
export class BookingSessionsController {
  constructor(private readonly bookingSessionsService: BookingSessionsService) {}

  @Patch(':sessionId/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.THERAPIST)
  scheduleSession(
    @CurrentUser() user: ActiveUserData,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Body() dto: ScheduleSessionDto,
  ) {
    return this.bookingSessionsService.scheduleSession(user.id, sessionId, dto);
  }

  @Patch(':sessionId/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.THERAPIST)
  completeSession(
    @CurrentUser() user: ActiveUserData,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ) {
    return this.bookingSessionsService.completeSession(user.id, sessionId);
  }
}
