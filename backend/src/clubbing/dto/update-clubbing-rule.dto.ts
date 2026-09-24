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

export class UpdateClubbingRuleDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsEnum(ClubbingRuleType)
  @IsOptional()
  type?: ClubbingRuleType;

  @IsInt()
  @Min(1)
  @IsOptional()
  requiredQuantity?: number;

  @IsNumber()
  @IsOptional()
  fixedPrice?: number;

  @IsNumber()
  @IsOptional()
  percentageOff?: number;

  @IsString()
  @IsOptional()
  applicableCategoryId?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applicableProductIds?: string[];

  @IsDateString()
  @IsOptional()
  startsAt?: string | null;

  @IsDateString()
  @IsOptional()
  endsAt?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
