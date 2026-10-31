import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CalculateShippingDto {
  @IsNumber()
  @Min(0)
  weight: number;

  @IsString()
  @IsOptional()
  destinationRegion?: string;

  @IsString()
  @IsOptional()
  pincode?: string;

  @IsNumber()
  @IsOptional()
  orderSubtotal?: number;
}
