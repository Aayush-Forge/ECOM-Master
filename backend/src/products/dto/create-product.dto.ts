import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus, ProductType } from '@prisma/client';
import { AttributeDto, VariationDto } from './variation.dto';

export class CreateProductDto {
  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsNumber()
  @IsOptional()
  basePrice?: number;

  @IsNumber()
  @IsOptional()
  compareAtPrice?: number;

  @IsNumber()
  @IsOptional()
  salePrice?: number;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsNumber()
  @IsOptional()
  length?: number;

  @IsNumber()
  @IsOptional()
  width?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsUUID()
  categoryId!: string;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsObject()
  @IsOptional()
  customFields?: Record<string, unknown>;

  @IsInt()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @IsEnum(ProductType)
  @IsOptional()
  productType?: ProductType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  @IsOptional()
  attributes?: AttributeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariationDto)
  @IsOptional()
  variations?: VariationDto[];
}
