import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

const DEFAULT_LIMIT = 5;

export class ListTherapistReviewsQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : DEFAULT_LIMIT))
  @IsInt()
  @Min(1)
  @Max(20)
  limit: number = DEFAULT_LIMIT;
}
