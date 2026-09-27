import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  Body,
  Req,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { AuthGuard } from '../auth/auth.guard';

interface AuthenticatedRequest extends Request {
  user: { sub: string; role: string };
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(AuthGuard)
  @Post('orders/:orderId/initiate')
  initiate(
    @Param('orderId') orderId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.initiatePayment(req.user.sub, orderId);
  }

  @UseGuards(AuthGuard)
  @Post('verify')
  verify(@Body() dto: VerifyPaymentDto, @Req() req: AuthenticatedRequest) {
    return this.paymentsService.verifyClientCallback(req.user.sub, dto);
  }

  // No AuthGuard: Razorpay calls this directly and cannot send our JWT.
  // Trust is established purely via the HMAC signature on the raw body.
  @Post('webhook/razorpay')
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Headers('x-razorpay-event-id') eventId: string | undefined,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Missing request body');
    }
    await this.paymentsService.handleWebhook(req.rawBody, signature, eventId);
    return { status: 'ok' };
  }
}
