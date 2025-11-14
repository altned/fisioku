import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Gender, UserRole } from '@prisma/client';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{8,}$/;

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must include uppercase, lowercase, number, and special character',
  })
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.THERAPIST)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.THERAPIST)
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  specialties?: string[];

  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.THERAPIST)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears?: number;

  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.THERAPIST)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  licenseNumber?: string;

  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.THERAPIST)
  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.THERAPIST)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
