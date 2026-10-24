import { IsInt, IsNotEmpty, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;
}
