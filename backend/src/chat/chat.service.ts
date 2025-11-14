import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatThread } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureThreadForBooking(
    bookingId: string,
    patientId: string,
    therapistId: string,
  ): Promise<ChatThread> {
    return this.prisma.chatThread.upsert({
      where: { bookingId },
      update: {},
      create: {
        bookingId,
        patientId,
        therapistId,
        firestoreId: bookingId,
      },
    });
  }

  async getThreadForUser(
    bookingId: string,
    userId: string,
  ): Promise<ChatThread> {
    const thread = await this.prisma.chatThread.findUnique({
      where: { bookingId },
    });

    if (!thread) {
      throw new NotFoundException('Chat thread not found.');
    }

    if (thread.patientId !== userId && thread.therapistId !== userId) {
      throw new ForbiddenException('Access denied for this chat thread.');
    }

    return thread;
  }

  async lockThread(bookingId: string, locked: boolean): Promise<ChatThread> {
    const thread = await this.prisma.chatThread.findUnique({
      where: { bookingId },
    });
    if (!thread) {
      throw new NotFoundException('Chat thread not found.');
    }

    return this.prisma.chatThread.update({
      where: { bookingId },
      data: {
        lockedAt: locked ? new Date() : null,
      },
    });
  }
}
