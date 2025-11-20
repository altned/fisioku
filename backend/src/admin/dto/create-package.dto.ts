import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePackageDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @Min(1)
  sessionCount: number;

  @IsInt()
  @Min(0)
  price: number;

  @IsInt()
  @Min(10)
  @Max(100)
  therapistSharePercentage: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultExpiryDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
