import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShippingRateType } from '@prisma/client';
import { ShippingSlabDto } from './shipping-slab.dto';

export class CreateShippingTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  carrierName?: string;

  @IsEnum(ShippingRateType)
  @IsOptional()
  rateType?: ShippingRateType = ShippingRateType.order_value;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingSlabDto)
  slabs: ShippingSlabDto[];

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
