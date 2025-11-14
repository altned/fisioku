import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpsertSessionNoteDto {
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  content: string;
}
