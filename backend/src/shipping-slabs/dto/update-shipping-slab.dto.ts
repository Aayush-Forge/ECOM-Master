import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class UpdateShippingSlabDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minWeight?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxWeight?: number;

  @IsString()
  @IsOptional()
  destinationRegion?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  rate?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
