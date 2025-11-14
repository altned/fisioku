import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RegisterNotificationTokenDto } from './dto/register-notification-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';

@Controller({
  path: 'notifications',
  version: '1',
})
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('tokens')
  @UseGuards(JwtAuthGuard)
  registerToken(
    @CurrentUser() user: ActiveUserData,
    @Body() dto: RegisterNotificationTokenDto,
  ) {
    return this.notificationsService.registerDeviceToken(user.id, dto);
  }

  @Delete('tokens/:token')
  @UseGuards(JwtAuthGuard)
  removeToken(
    @CurrentUser() user: ActiveUserData,
    @Param('token') token: string,
  ) {
    return this.notificationsService.removeDeviceToken(user.id, token);
  }
}
