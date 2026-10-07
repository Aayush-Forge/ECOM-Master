import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  toStatus!: OrderStatus;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  trackingUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  trackingNumber?: string;
}
