import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsDateString,
} from 'class-validator';
export enum ClubbingRuleType {
  fixed_price_bundle = 'fixed_price_bundle',
  percentage_off_bundle = 'percentage_off_bundle',
}

export class CreateClubbingRuleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(ClubbingRuleType)
  type!: ClubbingRuleType;

  @IsInt()
  requiredQuantity!: number;

  @IsNumber()
  @IsOptional()
  fixedPrice?: number;

  @IsNumber()
  @IsOptional()
  percentageOff?: number;

  @IsString()
  @IsOptional()
  applicableCategoryId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applicableProductIds?: string[];

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsBoolean()
  isActive!: boolean;
}