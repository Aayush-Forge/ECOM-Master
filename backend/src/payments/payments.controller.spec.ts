import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: PaymentsService;

  beforeEach(async () => {
    const mockPaymentsService = {
      createSession: jest.fn(),
      verifyPayment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get<PaymentsService>(PaymentsService);
  });

  it('should delegate createSession to paymentsService', async () => {
    const mockSession = {
      razorpayOrderId: 'order_123',
      amount: 260,
      currency: 'INR',
      keyId: '',
    };
    (paymentsService.createSession as jest.Mock).mockResolvedValue(mockSession);

    const result = await controller.createSession({
      orderId: 'f477218f-a073-4e86-9d5d-4c78c6776a76',
    });

    expect(paymentsService.createSession).toHaveBeenCalledWith(
      'f477218f-a073-4e86-9d5d-4c78c6776a76',
    );
    expect(result).toEqual(mockSession);
  });

  it('should delegate verify to paymentsService', async () => {
    const mockDto = {
      orderId: 'f477218f-a073-4e86-9d5d-4c78c6776a76',
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_123',
      razorpaySignature: 'sig_123',
    };
    const mockResult = {
      success: true,
      orderId: mockDto.orderId,
      status: 'paid',
    };
    (paymentsService.verifyPayment as jest.Mock).mockResolvedValue(mockResult);

    const result = await controller.verify(mockDto);

    expect(paymentsService.verifyPayment).toHaveBeenCalledWith(mockDto);
    expect(result).toEqual(mockResult);
  });
});
