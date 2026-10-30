import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkIdsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class BulkStatusDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];

  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;
}

export class CartItemDiscountInputDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNotEmpty()
  quantity!: number;

  @IsNotEmpty()
  price!: number;
}

export class CalculateDiscountDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDiscountInputDto)
  cartItems!: CartItemDiscountInputDto[];

  @IsOptional()
  @IsString()
  couponCode?: string;
}
