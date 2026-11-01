import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { RecordPaymentFailureDto } from './dto/record-payment-failure.dto.js';
import { GetPaymentsQueryDto } from './dto/get-payments-query.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ROLES } from '../auth/roles.constants.js';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('')
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

  @Post('payments/fail')
  @Public()
  recordFailure(@Body() dto: RecordPaymentFailureDto) {
    return this.paymentsService.recordPaymentFailure(dto);
  }

  @Post('payments/webhook')
  @Public()
  @SkipThrottle()
  handleWebhook(
    @Req() req: any,
    @Headers('x-razorpay-signature') signatureHeader?: string,
    @Body() body?: any,
  ) {
    if (!req?.rawBody) {
      throw new BadRequestException('Raw request body is required for webhook signature verification');
    }
    const signature = signatureHeader || req?.headers?.['x-razorpay-signature'] || '';
    const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody.toString('utf8') : String(req.rawBody);
    let payload = body;
    if (!payload || typeof payload !== 'object') {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = {};
      }
    }
    return this.paymentsService.handleWebhook(payload, signature, rawBody);
  }

  @Get('admin/payments')
  @Roles(ROLES.READ_ONLY)
  getAllPayments(
    @Query() query: GetPaymentsQueryDto,
    page?: number,
    perPage?: number,
    sortBy?: string,
    sortOrder?: string,
  ) {
    if (typeof query === 'string' || page !== undefined) {
      return this.paymentsService.getAllPayments(
        typeof query === 'string' ? query : undefined,
        page,
        perPage,
        sortBy,
        sortOrder,
      );
    }
    const q = query ?? new GetPaymentsQueryDto();
    const effectivePage = typeof q.getEffectivePage === 'function' ? q.getEffectivePage() : (q.page ?? 1);
    const effectiveLimit = typeof q.getEffectiveLimit === 'function' ? q.getEffectiveLimit(20) : (q.limit ?? q.per_page ?? q.perPage ?? 20);
    return this.paymentsService.getAllPayments(
      q.status,
      effectivePage,
      effectiveLimit,
      q.sortBy ?? q.sort_by,
      q.sortOrder ?? q.sort_order,
    );
  }

  @Get('admin/payments/order/:orderId')
  @Roles(ROLES.READ_ONLY)
  getPaymentByOrderId(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentByOrderId(orderId);
  }
}
