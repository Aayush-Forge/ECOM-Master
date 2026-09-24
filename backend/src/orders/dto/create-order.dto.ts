import { IsArray, IsNotEmpty, IsOptional, IsString, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @IsNotEmpty()
  quantity!: number;
}

export class CreateOrderDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}