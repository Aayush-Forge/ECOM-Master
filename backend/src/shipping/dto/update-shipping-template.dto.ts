import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShippingRateType } from '@prisma/client';
import { ShippingSlabDto } from './shipping-slab.dto';

export class UpdateShippingTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  carrierName?: string;

  @IsEnum(ShippingRateType)
  @IsOptional()
  rateType?: ShippingRateType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingSlabDto)
  @IsOptional()
  slabs?: ShippingSlabDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  freeShippingThreshold?: number | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
