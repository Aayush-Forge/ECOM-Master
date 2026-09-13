import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateCartDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
