import { IsBoolean } from 'class-validator';

export class TogglePackageDto {
  @IsBoolean()
  isActive: boolean;
}
