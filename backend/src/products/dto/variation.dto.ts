import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttributeDto {
  @IsOptional()
  id?: number | string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  options!: string[];

  @IsBoolean()
  @IsOptional()
  variation?: boolean;

  @IsBoolean()
  @IsOptional()
  visible?: boolean;
}

export class VariationAttributeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  option!: string;
}

export class VariationDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsNumber()
  @IsPositive({ message: 'regularPrice must be greater than 0.' })
  regularPrice!: number;

  @IsNumber()
  @IsOptional()
  salePrice?: number;

  @IsInt()
  @Min(0, { message: 'stockQuantity cannot be negative.' })
  @IsOptional()
  stockQuantity?: number;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsOptional()
  image?: string | { src: string };

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariationAttributeDto)
  attributes!: VariationAttributeDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
