import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import Razorpay from 'razorpay';
import { RAZORPAY_CONFIG } from './razorpay.config.js';

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private client: Razorpay | null = null;

  private getClient(): Razorpay {
    if (!RAZORPAY_CONFIG.keyId || !RAZORPAY_CONFIG.keySecret) {
      throw new Error('Razorpay credentials are not configured.');
    }

    if (!this.client) {
      this.client = new Razorpay({
        key_id: RAZORPAY_CONFIG.keyId,
        key_secret: RAZORPAY_CONFIG.keySecret,
      });
    }

    return this.client;
  }

  async createOrder(
    amountInPaise: number,
    currency: string,
    receipt: string,
  ) {
    try {
      const client = this.getClient();
      const order = await client.orders.create({
        amount: amountInPaise,
        currency,
        receipt,
      });

      return order;
    } catch (error) {
      this.logger.error(
        `Razorpay order creation failed for receipt "${receipt}": ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException(
        'Razorpay payment gateway service is unavailable. Please try again later.',
      );
    }
  }
}
