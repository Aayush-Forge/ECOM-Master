import { ServiceUnavailableException } from '@nestjs/common';
import { RazorpayService } from './razorpay.service.js';

describe('RazorpayService', () => {
  let service: RazorpayService;

  beforeEach(() => {
    service = new RazorpayService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ServiceUnavailableException when credentials are missing or call fails', async () => {
    await expect(
      service.createOrder(10000, 'INR', 'receipt-1'),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
