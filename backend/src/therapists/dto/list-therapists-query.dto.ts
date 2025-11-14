import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export class ListTherapistsQueryDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @Transform(({ value }) => (value ? Number(value) : DEFAULT_PAGE))
  @IsInt()
  @Min(1)
  page: number = DEFAULT_PAGE;

  @Transform(({ value }) => (value ? Number(value) : DEFAULT_LIMIT))
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = DEFAULT_LIMIT;
}
