import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { LockChatDto } from './dto/lock-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller({
  path: 'chat/threads',
  version: '1',
})
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':bookingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT, UserRole.THERAPIST)
  async getThread(
    @CurrentUser() user: ActiveUserData,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
  ) {
    const thread = await this.chatService.getThreadForUser(bookingId, user.id);
    return {
      firestoreId: thread.firestoreId,
      bookingId: thread.bookingId,
      locked: Boolean(thread.lockedAt),
      lastMessageAt: thread.lastMessageAt,
    };
  }

  @Patch(':bookingId/lock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async lockThread(
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body() dto: LockChatDto,
  ) {
    const thread = await this.chatService.lockThread(bookingId, dto.locked);
    return {
      bookingId: thread.bookingId,
      locked: Boolean(thread.lockedAt),
    };
  }

  @Post(':bookingId/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT, UserRole.THERAPIST)
  async sendMessage(
    @CurrentUser() user: ActiveUserData,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body() dto: SendMessageDto,
  ) {
    await this.chatService.sendMessage(bookingId, user.id, dto.message);
    return { status: 'ok' };
  }
}
