import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: PaymentsService;

  beforeEach(async () => {
    const mockPaymentsService = {
      createSession: jest.fn(),
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
});
