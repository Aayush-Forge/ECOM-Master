import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreatePaymentSessionDto {
  @IsNotEmpty()
  @IsUUID()
  orderId!: string;
}
