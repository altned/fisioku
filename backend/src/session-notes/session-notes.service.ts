import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertSessionNoteDto } from './dto/upsert-session-note.dto';

@Injectable()
export class SessionNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertNote(
    therapistId: string,
    sessionId: string,
    dto: UpsertSessionNoteDto,
  ) {
    const session = await this.prisma.bookingSession.findUnique({
      where: { id: sessionId },
      include: {
        booking: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    if (session.booking.therapistId !== therapistId) {
      throw new ForbiddenException('You cannot update this session note.');
    }

    return this.prisma.sessionNote.upsert({
      where: { sessionId },
      update: {
        content: dto.content,
      },
      create: {
        sessionId,
        therapistId,
        content: dto.content,
      },
    });
  }
}
