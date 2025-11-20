import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ChatThread } from '@prisma/client';
import { FieldValue } from 'firebase-admin/firestore';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseAdminService } from '../notifications/firebase-admin.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly notificationsService: NotificationsService,
  ) {}

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

  async sendMessage(
    bookingId: string,
    senderId: string,
    message: string,
  ): Promise<void> {
    const thread = await this.getThreadForUser(bookingId, senderId);
    if (thread.lockedAt && thread.lockedAt.getTime() <= Date.now()) {
      throw new BadRequestException('Chat thread already locked.');
    }

    const firestore = this.firebaseAdminService.firestore;
    if (!firestore) {
      throw new ServiceUnavailableException(
        'Chat service not available. Contact administrator.',
      );
    }

    const trimmed = message.trim();
    if (!trimmed) {
      throw new BadRequestException('Message cannot be empty.');
    }

    const messagesCollection = firestore
      .collection('chat_threads')
      .doc(thread.firestoreId)
      .collection('messages');

    await messagesCollection.add({
      senderId,
      message: trimmed,
      sentAt: FieldValue.serverTimestamp(),
    });

    await this.prisma.chatThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() },
    });

    await this.prisma.chatMessage.create({
      data: {
        bookingId: thread.bookingId,
        senderId,
        message: trimmed,
      },
    });

    await this.notificationsService.notifyChatMessage(
      thread,
      senderId,
      trimmed,
    );
  }
}
