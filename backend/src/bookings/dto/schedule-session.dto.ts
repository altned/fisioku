import { IsISO8601 } from 'class-validator';

export class ScheduleSessionDto {
  @IsISO8601()
  scheduledAt: string;
}
