import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class RecordPaymentFailureDto {
  @IsNotEmpty()
  @IsUUID()
  orderId!: string;

  @IsNotEmpty()
  @IsString()
  razorpayOrderId!: string;

  @IsOptional()
  @IsString()
  razorpayPaymentId?: string;

  @IsOptional()
  @IsString()
  errorCode?: string;

  @IsOptional()
  @IsString()
  errorDescription?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  step?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
