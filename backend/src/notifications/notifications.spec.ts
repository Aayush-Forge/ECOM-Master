import { Test, TestingModule } from '@nestjs/testing';
import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsListener } from './notifications.listener.js';
import { NotificationProcessor } from './notification-processor.js';
import { EMAIL_PROVIDER, EmailProvider } from './providers/email-provider.interface.js';
import {
  NOTIFICATION_PUBLISHER,
  NotificationPublisher,
} from './publishers/notification-publisher.interface.js';
import {
  escapeHtml,
  formatINR,
  renderEmailTemplate,
} from './templates/email-templates.js';

describe('Notifications Module Unit Tests', () => {
  describe('Email Templates & Escaping', () => {
    it('should strictly escape HTML special characters', () => {
      const malicious = '<script>alert("xss")</script> & \'test\'';
      const escaped = escapeHtml(malicious);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;test&#39;');
      expect(escaped).not.toContain('<script>');
    });

    it('should format numbers into Indian Rupees (INR)', () => {
      expect(formatINR(0)).toBe('₹0.00');
      expect(formatINR(1234.5)).toBe('₹1,234.50');
      expect(formatINR('50000')).toBe('₹50,000.00');
      expect(formatINR(null)).toBe('₹0.00');
    });

    it('should render all 9 templates with proper subjects and content', () => {
      const mockOrder = {
        id: 'ord-123',
        orderNumber: 'ORD-2026-0001',
        grandTotal: 1500,
        subtotal: 1500,
        discountTotal: 0,
        taxTotal: 0,
        shippingTotal: 0,
        customer: {
          firstName: 'Deepak',
          lastName: 'Sharma',
          email: 'deepak@example.com',
        },
        items: [
          {
            titleSnapshot: '<Product 1>',
            skuSnapshot: 'SKU-1',
            quantity: 2,
            unitPriceSnapshot: 750,
            lineTotal: 1500,
          },
        ],
        addresses: [
          {
            type: 'shipping',
            fullName: 'Deepak Sharma',
            phone: '9876543210',
            addressLine1: '123 MG Road',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560001',
            country: 'India',
          },
        ],
      };

      const templateKeys = [
        'order_confirmation',
        'status_processing',
        'status_shipped',
        'status_delivered',
        'order_cancelled',
        'order_failed',
        'refund_processed',
        'internal_new_order',
        'internal_payment_failed',
      ];

      for (const key of templateKeys) {
        const rendered = renderEmailTemplate(key, mockOrder);
        expect(rendered.subject).toBeDefined();
        expect(rendered.subject).toContain('ORD-2026-0001');
        expect(rendered.html).toBeDefined();
        expect(rendered.html).toContain('ORD-2026-0001');
        if (key === 'order_confirmation' || key === 'internal_new_order') {
          expect(rendered.html).toContain('&lt;Product 1&gt;'); // Escaped title
        }
        expect(rendered.text).toBeDefined();
        expect(rendered.text).toContain('ORD-2026-0001');
      }
    });
  });

  describe('NotificationsService', () => {
    let service: NotificationsService;
    let prisma: any;
    let publisher: any;

    beforeEach(async () => {
      prisma = {
        order: {
          findUnique: jest.fn(),
        },
        notificationLog: {
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
      };

      publisher = {
        publish: jest.fn().mockResolvedValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationsService,
          { provide: PrismaService, useValue: prisma },
          { provide: NOTIFICATION_PUBLISHER, useValue: publisher },
        ],
      }).compile();

      service = module.get<NotificationsService>(NotificationsService);
    });

    it('should log failed with reason no_recipient and stable idempotencyKey when order has no email', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'guest-ord-1',
        customerId: null,
        email: null,
        customer: null,
      });
      prisma.notificationLog.findUnique.mockResolvedValue(null);

      await service.dispatchCustomerNotification('guest-ord-1', 'order_confirmation');

      expect(publisher.publish).not.toHaveBeenCalled();
      expect(prisma.notificationLog.create).toHaveBeenCalledWith({
        data: {
          idempotencyKey: 'order:guest-ord-1:order_confirmation',
          orderId: 'guest-ord-1',
          userId: null,
          recipient: null,
          templateKey: 'order_confirmation',
          status: NotificationStatus.failed,
          error: 'no_recipient',
        },
      });
    });

    it('should resolve recipient from stored Order.email directly for guest orders', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'guest-ord-2',
        customerId: null,
        email: 'guest@example.com',
        customer: null,
      });
      prisma.notificationLog.findUnique.mockResolvedValue(null);

      await service.dispatchCustomerNotification('guest-ord-2', 'order_confirmation');

      expect(publisher.publish).toHaveBeenCalledWith({
        orderId: 'guest-ord-2',
        templateKey: 'order_confirmation',
        recipient: 'guest@example.com',
        idempotencyKey: 'order:guest-ord-2:order_confirmation',
      });
    });

    it('should skip publishing if notification was already sent (idempotency check via idempotencyKey)', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        customerId: 'usr-1',
        email: 'user@example.com',
        customer: { email: 'user@example.com' },
      });
      prisma.notificationLog.findUnique.mockResolvedValue({
        id: 'log-1',
        idempotencyKey: 'order:ord-1:order_confirmation',
        status: NotificationStatus.sent,
      });

      await service.dispatchCustomerNotification('ord-1', 'order_confirmation');

      expect(publisher.publish).not.toHaveBeenCalled();
    });

    it('should publish job with stable idempotencyKey when customer email exists', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        customerId: 'usr-1',
        email: null,
        customer: { email: 'user@example.com' },
      });
      prisma.notificationLog.findUnique.mockResolvedValue(null);

      await service.dispatchCustomerNotification('ord-1', 'order_confirmation');

      expect(publisher.publish).toHaveBeenCalledWith({
        orderId: 'ord-1',
        templateKey: 'order_confirmation',
        recipient: 'user@example.com',
        idempotencyKey: 'order:ord-1:order_confirmation',
      });
    });

    it('should dispatch internal alert with deterministic idempotencyKey for each email', async () => {
      process.env.INTERNAL_ALERT_EMAILS = 'admin1@sridattam.com, admin2@sridattam.com';
      prisma.notificationLog.findUnique.mockResolvedValue(null);

      await service.dispatchInternalAlert('ord-1', 'internal_new_order');

      expect(publisher.publish).toHaveBeenCalledTimes(2);
      expect(publisher.publish).toHaveBeenCalledWith({
        orderId: 'ord-1',
        templateKey: 'internal_new_order',
        recipient: 'admin1@sridattam.com',
        idempotencyKey: 'order:ord-1:internal_new_order:internal:admin1@sridattam.com',
      });
      expect(publisher.publish).toHaveBeenCalledWith({
        orderId: 'ord-1',
        templateKey: 'internal_new_order',
        recipient: 'admin2@sridattam.com',
        idempotencyKey: 'order:ord-1:internal_new_order:internal:admin2@sridattam.com',
      });
    });
  });

  describe('NotificationProcessor', () => {
    let processor: NotificationProcessor;
    let prisma: any;
    let emailProvider: any;

    beforeEach(async () => {
      prisma = {
        order: {
          findUnique: jest.fn(),
        },
        notificationLog: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
      };

      emailProvider = {
        send: jest.fn().mockResolvedValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationProcessor,
          { provide: PrismaService, useValue: prisma },
          { provide: EMAIL_PROVIDER, useValue: emailProvider },
        ],
      }).compile();

      processor = module.get<NotificationProcessor>(NotificationProcessor);
    });

    it('should send email and log sent status with idempotencyKey', async () => {
      prisma.notificationLog.findUnique.mockResolvedValue(null);
      prisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        orderNumber: 'ORD-100',
        customerId: 'usr-1',
        grandTotal: 500,
        subtotal: 500,
        email: 'alice@example.com',
        customer: { firstName: 'Alice', email: 'alice@example.com' },
        items: [],
        addresses: [],
      });

      await processor.process({
        orderId: 'ord-1',
        templateKey: 'order_confirmation',
        recipient: 'alice@example.com',
        idempotencyKey: 'order:ord-1:order_confirmation',
      });

      expect(emailProvider.send).toHaveBeenCalledTimes(1);
      expect(prisma.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          idempotencyKey: 'order:ord-1:order_confirmation',
          orderId: 'ord-1',
          recipient: 'alice@example.com',
          templateKey: 'order_confirmation',
          status: NotificationStatus.sent,
        }),
      });
    });

    it('should update existing record on retry if previously failed instead of creating duplicate', async () => {
      prisma.notificationLog.findUnique.mockResolvedValue({
        id: 'failed-log-id-1',
        idempotencyKey: 'order:ord-1:order_confirmation',
        status: NotificationStatus.failed,
        error: 'Timeout error',
      });
      prisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        orderNumber: 'ORD-100',
        customerId: 'usr-1',
        grandTotal: 500,
        subtotal: 500,
        email: 'alice@example.com',
        customer: { firstName: 'Alice', email: 'alice@example.com' },
        items: [],
        addresses: [],
      });

      await processor.process({
        orderId: 'ord-1',
        templateKey: 'order_confirmation',
        recipient: 'alice@example.com',
        idempotencyKey: 'order:ord-1:order_confirmation',
      });

      expect(emailProvider.send).toHaveBeenCalledTimes(1);
      expect(prisma.notificationLog.create).not.toHaveBeenCalled();
      expect(prisma.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'failed-log-id-1' },
        data: expect.objectContaining({
          status: NotificationStatus.sent,
          error: null,
        }),
      });
    });

    it('should record failure with idempotencyKey when email sending throws an error', async () => {
      prisma.notificationLog.findUnique.mockResolvedValue(null);
      prisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        orderNumber: 'ORD-100',
        customerId: 'usr-1',
        grandTotal: 500,
        email: 'alice@example.com',
        customer: { firstName: 'Alice', email: 'alice@example.com' },
      });
      emailProvider.send.mockRejectedValue(new Error('SMTP Connection Refused'));

      await processor.process({
        orderId: 'ord-1',
        templateKey: 'order_confirmation',
        recipient: 'alice@example.com',
        idempotencyKey: 'order:ord-1:order_confirmation',
      });

      expect(prisma.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          idempotencyKey: 'order:ord-1:order_confirmation',
          orderId: 'ord-1',
          recipient: 'alice@example.com',
          templateKey: 'order_confirmation',
          status: NotificationStatus.failed,
          error: 'SMTP Connection Refused',
        }),
      });
    });

    it('should skip job if already sent (BullMQ retry idempotency)', async () => {
      prisma.notificationLog.findUnique.mockResolvedValue({
        id: 'sent-log-id',
        idempotencyKey: 'order:ord-1:order_confirmation',
        status: NotificationStatus.sent,
      });

      await processor.process({
        orderId: 'ord-1',
        templateKey: 'order_confirmation',
        recipient: 'alice@example.com',
        idempotencyKey: 'order:ord-1:order_confirmation',
      });

      expect(emailProvider.send).not.toHaveBeenCalled();
      expect(prisma.notificationLog.create).not.toHaveBeenCalled();
      expect(prisma.notificationLog.update).not.toHaveBeenCalled();
    });
  });

  describe('NotificationsListener', () => {
    let listener: NotificationsListener;
    let service: any;

    beforeEach(async () => {
      service = {
        dispatchCustomerNotification: jest.fn().mockResolvedValue(undefined),
        dispatchInternalAlert: jest.fn().mockResolvedValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationsListener,
          { provide: NotificationsService, useValue: service },
        ],
      }).compile();

      listener = module.get<NotificationsListener>(NotificationsListener);
    });

    it('handles order.paid and triggers confirmation and internal alert', async () => {
      await listener.handleOrderPaid({ orderId: 'ord-paid-1' });

      expect(service.dispatchCustomerNotification).toHaveBeenCalledWith(
        'ord-paid-1',
        'order_confirmation',
      );
      expect(service.dispatchInternalAlert).toHaveBeenCalledWith(
        'ord-paid-1',
        'internal_new_order',
      );
    });

    it('handles order.processing and triggers status_processing', async () => {
      await listener.handleOrderProcessing({ orderId: 'ord-proc-1' });
      expect(service.dispatchCustomerNotification).toHaveBeenCalledWith(
        'ord-proc-1',
        'status_processing',
      );
    });

    it('handles order.shipped and triggers status_shipped', async () => {
      await listener.handleOrderShipped({ orderId: 'ord-ship-1' });
      expect(service.dispatchCustomerNotification).toHaveBeenCalledWith(
        'ord-ship-1',
        'status_shipped',
      );
    });

    it('handles order.delivered and triggers status_delivered', async () => {
      await listener.handleOrderDelivered({ orderId: 'ord-del-1' });
      expect(service.dispatchCustomerNotification).toHaveBeenCalledWith(
        'ord-del-1',
        'status_delivered',
      );
    });

    it('handles order.cancelled and triggers order_cancelled', async () => {
      await listener.handleOrderCancelled({ orderId: 'ord-canc-1' });
      expect(service.dispatchCustomerNotification).toHaveBeenCalledWith(
        'ord-canc-1',
        'order_cancelled',
      );
    });

    it('handles payment.failed and triggers internal_payment_failed', async () => {
      await listener.handlePaymentFailed({ orderId: 'ord-fail-1' });
      expect(service.dispatchInternalAlert).toHaveBeenCalledWith(
        'ord-fail-1',
        'internal_payment_failed',
      );
    });
  });
});
