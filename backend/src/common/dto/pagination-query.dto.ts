import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must not be less than 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must not be less than 1' })
  @Max(100, { message: 'limit must not be greater than 100' })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'per_page must be an integer' })
  @Min(1, { message: 'per_page must not be less than 1' })
  @Max(100, { message: 'per_page must not be greater than 100' })
  per_page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'perPage must be an integer' })
  @Min(1, { message: 'perPage must not be less than 1' })
  @Max(100, { message: 'perPage must not be greater than 100' })
  perPage?: number;

  getEffectivePage(defaultPage = 1): number {
    return this.page !== undefined && this.page !== null ? this.page : defaultPage;
  }

  getEffectiveLimit(defaultLimit = 20): number {
    return this.limit ?? this.per_page ?? this.perPage ?? defaultLimit;
  }

  getSkip(defaultLimit = 20): number {
    const page = this.getEffectivePage(1);
    const limit = this.getEffectiveLimit(defaultLimit);
    return Math.max(0, (page - 1) * limit);
  }
}
