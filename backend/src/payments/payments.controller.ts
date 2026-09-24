import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('payments')
@UsePipes(new ValidationPipe({ whitelist: true }))
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-session')
  @Public()
  createSession(@Body() dto: CreatePaymentSessionDto) {
    return this.paymentsService.createSession(dto.orderId);
  }

  @Post('verify')
  @Public()
  verify(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }
}
