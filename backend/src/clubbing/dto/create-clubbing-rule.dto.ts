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
import { ClubbingRuleType } from '../../generated/prisma';

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