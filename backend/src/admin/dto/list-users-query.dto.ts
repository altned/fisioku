import { UserRole, UserStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Max, Min } from 'class-validator';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export class ListUsersQueryDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @Transform(({ value }) => (value ? Number(value) : DEFAULT_PAGE))
  @Min(1)
  page: number = DEFAULT_PAGE;

  @Transform(({ value }) => (value ? Number(value) : DEFAULT_LIMIT))
  @Min(1)
  @Max(100)
  limit: number = DEFAULT_LIMIT;

  @IsOptional()
  @IsString()
  search?: string;
}
