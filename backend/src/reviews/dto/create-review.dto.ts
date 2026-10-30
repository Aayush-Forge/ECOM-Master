import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

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

  @ValidateIf((o) => !o.phone || o.email)
  @IsEmail({}, { message: 'A valid email address is required if phone is not provided' })
  @IsOptional()
  email?: string;

  @ValidateIf((o) => !o.email || o.phone)
  @IsString()
  @IsNotEmpty({ message: 'A valid phone number is required if email is not provided' })
  @IsOptional()
  phone?: string;
}
