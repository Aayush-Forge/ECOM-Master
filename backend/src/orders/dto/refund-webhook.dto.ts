import { IsNotEmpty, IsString, IsObject, IsOptional, IsArray, IsNumber } from 'class-validator';

export class RefundWebhookDto {
  @IsString()
  @IsNotEmpty()
  event!: string; // e.g., 'refund.processed'

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  account_id?: string;

  @IsOptional()
  @IsArray()
  contains?: string[];

  @IsOptional()
  @IsObject()
  payload?: {
    refund?: {
      entity?: {
        id?: string;
        payment_id?: string;
        amount?: number;
        currency?: string;
        status?: string;
        notes?: Record<string, any>;
      };
    };
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
        notes?: Record<string, any>;
      };
    };
    [key: string]: any;
  };

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  created_at?: number;
}