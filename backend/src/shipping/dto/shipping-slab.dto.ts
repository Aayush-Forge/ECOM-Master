import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ShippingSlabDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  upTo?: number | null;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  charge: number;
}
