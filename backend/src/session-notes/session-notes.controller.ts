import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { SessionNotesService } from './session-notes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { UpsertSessionNoteDto } from './dto/upsert-session-note.dto';

@Controller({
  path: 'booking-sessions',
  version: '1',
})
export class SessionNotesController {
  constructor(private readonly sessionNotesService: SessionNotesService) {}

  @Put(':sessionId/note')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.THERAPIST)
  upsertNote(
    @CurrentUser() user: ActiveUserData,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Body() dto: UpsertSessionNoteDto,
  ) {
    return this.sessionNotesService.upsertNote(user.id, sessionId, dto);
  }
}
