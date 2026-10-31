import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreateShippingSlabDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  minWeight: number;

  @IsNumber()
  @Min(0)
  maxWeight: number;

  @IsString()
  @IsNotEmpty()
  destinationRegion: string;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
