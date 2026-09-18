import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ROLES } from '../auth/roles.constants.js';

@Controller('payments')
@Roles(ROLES.CUSTOMER)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-session')
  createSession(@Body() dto: CreatePaymentSessionDto) {
    return this.paymentsService.createSession(dto.orderId);
  }
}
