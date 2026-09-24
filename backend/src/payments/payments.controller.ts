import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ROLES } from '../auth/roles.constants.js';

@Controller('')
@UsePipes(new ValidationPipe({ whitelist: true }))
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('payments/create-session')
  @Public()
  createSession(@Body() dto: CreatePaymentSessionDto) {
    return this.paymentsService.createSession(dto.orderId);
  }

  @Post('payments/verify')
  @Public()
  verify(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }

  @Get('admin/payments')
  @Roles(ROLES.READ_ONLY)
  getAllPayments(
    @Query('status') status?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('per_page', new ParseIntPipe({ optional: true })) perPage?: number,
  ) {
    return this.paymentsService.getAllPayments(status, page, perPage);
  }

  @Get('admin/payments/order/:orderId')
  @Roles(ROLES.READ_ONLY)
  getPaymentByOrderId(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentByOrderId(orderId);
  }
}
