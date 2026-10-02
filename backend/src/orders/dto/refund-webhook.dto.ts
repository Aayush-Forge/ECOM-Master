import { IsNotEmpty, IsString, IsObject, IsOptional } from 'class-validator';

export class RefundWebhookDto {
  @IsString()
  @IsNotEmpty()
  event!: string; // e.g., 'refund.processed'

  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}