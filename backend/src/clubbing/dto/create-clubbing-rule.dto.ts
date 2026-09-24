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
  Min,
} from 'class-validator';
import { ClubbingRuleType } from '@prisma/client';

export class CreateClubbingRuleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ClubbingRuleType)
  type!: ClubbingRuleType;

  @IsInt()
  @Min(1)
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
  @IsOptional()
  isActive?: boolean;
}
