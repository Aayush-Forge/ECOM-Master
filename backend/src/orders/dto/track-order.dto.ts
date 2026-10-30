import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TrackOrderDto {
  @IsString()
  @IsNotEmpty()
  orderNumber!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsOptional()
  email?: string;
}
