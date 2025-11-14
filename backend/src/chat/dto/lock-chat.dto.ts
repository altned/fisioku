import { IsBoolean } from 'class-validator';

export class LockChatDto {
  @IsBoolean()
  locked: boolean;
}
