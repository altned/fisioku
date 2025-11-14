import { Module } from '@nestjs/common';
import { SessionNotesController } from './session-notes.controller';
import { SessionNotesService } from './session-notes.service';

@Module({
  controllers: [SessionNotesController],
  providers: [SessionNotesService],
})
export class SessionNotesModule {}
