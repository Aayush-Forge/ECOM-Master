import { ForbiddenException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { ROLES, ROLES_KEY } from '../auth/roles.constants.js';
import { AdminEmailLogsController } from './admin-email-logs.controller.js';
import { AdminEmailTemplatesController } from './admin-email-templates.controller.js';
import { AdminEmailService } from './admin-email.service.js';
import { AdminEmailTemplatesService } from './admin-email-templates.service.js';
import { renderEmailTemplate, applyWordingPlaceholders, escapeHtml } from './templates/email-templates.js';

describe('Admin Email Module Specs', () => {
  let reflector: Reflector;
  let rolesGuard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  describe('1. Role Authorization (Admin Only, 403 on non-admin)', () => {
    it('should protect AdminEmailLogsController with admin role', () => {
      const classRoles = reflector.get<string[]>(ROLES_KEY, AdminEmailLogsController);
      expect(classRoles).toEqual([ROLES.ADMIN]);
    });

    it('should protect AdminEmailTemplatesController with admin role', () => {
      const classRoles = reflector.get<string[]>(ROLES_KEY, AdminEmailTemplatesController);
      expect(classRoles).toEqual([ROLES.ADMIN]);
    });

    it('should reject non-admin roles with ForbiddenException (403)', () => {
      const nonAdminRoles = ['editor', 'read_only', 'customer', 'guest', ''];

      for (const role of nonAdminRoles) {
        const mockContext: any = {
          getHandler: () => AdminEmailLogsController.prototype.getLogs,
          getClass: () => AdminEmailLogsController,
          switchToHttp: () => ({
            getRequest: () => ({ user: { id: 'u1', role } }),
          }),
        };

        expect(() => rolesGuard.canActivate(mockContext)).toThrow(ForbiddenException);
      }
    });

    it('should allow admin role through RolesGuard', () => {
      const mockContext: any = {
        getHandler: () => AdminEmailLogsController.prototype.getLogs,
        getClass: () => AdminEmailLogsController,
        switchToHttp: () => ({
          getRequest: () => ({ user: { id: 'admin1', role: 'admin' } }),
        }),
      };

      expect(rolesGuard.canActivate(mockContext)).toBe(true);
    });
  });

  describe('2. Wording Validation & HTML / Unknown Placeholders Rejection', () => {
    let service: AdminEmailTemplatesService;
    const mockPrisma: any = {
      emailTemplate: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    const mockAudit: any = {
      createLog: jest.fn(),
    };

    beforeEach(() => {
      service = new AdminEmailTemplatesService(mockPrisma, mockAudit);
    });

    it('should reject HTML tags (< or >) with BadRequestException', async () => {
      await expect(
        service.updateTemplate('order_confirmation', {
          heading: 'Hello <script>alert(1)</script>',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateTemplate('order_confirmation', {
          intro: '<b>Bold text</b>',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject unknown placeholders with BadRequestException', async () => {
      await expect(
        service.updateTemplate('order_confirmation', {
          subject: 'Order {{invalidVar}} update',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateTemplate('order_confirmation', {
          footer: 'Best, {{unknown}}',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept allowed placeholders: {{orderNumber}}, {{customerName}}, {{brandName}}', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);
      mockPrisma.emailTemplate.upsert.mockResolvedValue({
        key: 'order_confirmation',
        subject: 'Order #{{orderNumber}} for {{customerName}} by {{brandName}}',
        heading: 'Order #{{orderNumber}}',
        intro: 'Hello {{customerName}}',
        footer: 'Team {{brandName}}',
        updatedAt: new Date(),
      });

      const res = await service.updateTemplate('order_confirmation', {
        subject: 'Order #{{orderNumber}} for {{customerName}} by {{brandName}}',
        heading: 'Order #{{orderNumber}}',
        intro: 'Hello {{customerName}}',
        footer: 'Team {{brandName}}',
      });

      expect(res.key).toBe('order_confirmation');
      expect(res.overrides.subject).toContain('{{orderNumber}}');
    });
  });

  describe('3. Escaping & Placeholder Replacement', () => {
    it('should replace allowed placeholders and escape correctly in render', () => {
      const order = {
        orderNumber: 'ORD-999',
        customer: { firstName: 'Ram & Sita' },
        grandTotal: 1000,
        subtotal: 1000,
        items: [],
      };

      const replaced = applyWordingPlaceholders(
        'Dear {{customerName}}, your order {{orderNumber}} at {{brandName}}',
        order,
      );
      expect(replaced).toContain('Ram & Sita');
      expect(replaced).toContain('ORD-999');

      const rendered = renderEmailTemplate('order_confirmation', order, {
        heading: 'Confirmed for {{customerName}}',
        intro: 'Paragraph 1 for {{customerName}}\n\nParagraph 2 with & symbols',
      });

      expect(rendered.html).toContain('Confirmed for Ram &amp; Sita');
      expect(rendered.html).toContain('Paragraph 1 for Ram &amp; Sita');
      expect(rendered.html).toContain('Paragraph 2 with &amp; symbols');
      expect(rendered.html).toContain('<p style=');
    });
  });

  describe('4. Override vs Default Fallback', () => {
    const order = {
      orderNumber: 'ORD-101',
      customer: { firstName: 'Alice' },
      grandTotal: 500,
      subtotal: 500,
      items: [],
    };

    it('should use code defaults when overrides are null or empty', () => {
      const rendered = renderEmailTemplate('order_confirmation', order, {
        subject: null,
        heading: '',
        intro: undefined,
        footer: '',
      });

      expect(rendered.subject).toBe('Order Confirmed: #ORD-101');
      expect(rendered.text).toContain('Order Confirmed');
      expect(rendered.text).toContain('Thank you for shopping with us!');
      expect(rendered.text).toContain('Warm regards,');
    });

    it('should apply partial overrides and keep defaults for unset fields', () => {
      const rendered = renderEmailTemplate('order_confirmation', order, {
        heading: 'Custom Order Title',
      });

      expect(rendered.subject).toBe('Order Confirmed: #ORD-101');
      expect(rendered.text).toContain('Custom Order Title');
      expect(rendered.text).toContain('Thank you for shopping with us!');
    });
  });

  describe('5. Retry Constraints & Double-click Claim Guard', () => {
    let service: AdminEmailService;
    let mockPrisma: any;
    let mockAudit: any;
    let mockProvider: any;

    beforeEach(() => {
      mockPrisma = {
        notificationLog: {
          findUnique: jest.fn(),
          updateMany: jest.fn(),
          update: jest.fn(),
        },
        order: {
          findUnique: jest.fn(),
        },
        emailTemplate: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };
      mockAudit = { createLog: jest.fn().mockResolvedValue({}) };
      mockProvider = { send: jest.fn().mockResolvedValue({ success: true }) };

      service = new AdminEmailService(mockPrisma, mockProvider, mockAudit);
    });

    it('should throw NotFoundException (404) if log row does not exist', async () => {
      mockPrisma.notificationLog.findUnique.mockResolvedValue(null);
      await expect(service.retryNotification('log-missing')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException (409) if log status is already sent', async () => {
      mockPrisma.notificationLog.findUnique.mockResolvedValue({
        id: 'log-sent',
        status: 'sent',
      });
      await expect(service.retryNotification('log-sent')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException (409) if double-click claim (updateMany) matches 0 rows', async () => {
      mockPrisma.notificationLog.findUnique.mockResolvedValue({
        id: 'log-failed',
        status: 'failed',
        orderId: 'ord-1',
        templateKey: 'order_confirmation',
        recipient: 'test@example.com',
      });
      // Double click race condition: updateMany returns count 0
      mockPrisma.notificationLog.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.retryNotification('log-failed')).rejects.toThrow(ConflictException);
    });

    it('should claim row, send email, and update the SAME row without creating a new one', async () => {
      mockPrisma.notificationLog.findUnique.mockResolvedValue({
        id: 'log-failed',
        status: 'failed',
        orderId: 'ord-1',
        templateKey: 'order_confirmation',
        recipient: 'test@example.com',
      });
      mockPrisma.notificationLog.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        orderNumber: 'ORD-1',
        email: 'test@example.com',
        customer: { email: 'test@example.com' },
        items: [],
      });
      mockPrisma.notificationLog.update.mockResolvedValue({
        id: 'log-failed',
        status: 'sent',
      });

      const res = await service.retryNotification('log-failed', { id: 'admin1', role: 'admin' });

      expect(res.status).toBe('sent');
      expect(mockPrisma.notificationLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'log-failed' },
          data: expect.objectContaining({ status: 'sent', error: null }),
        }),
      );
      expect(mockAudit.createLog).toHaveBeenCalled();
    });
  });

  describe('6. Stats Math', () => {
    let service: AdminEmailService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        notificationLog: {
          count: jest.fn(),
        },
      };
      service = new AdminEmailService(mockPrisma, {} as any, {} as any);
    });

    it('should calculate failureRatePercent accurately', async () => {
      // 10 sent, 2 failed -> total 12 -> 2/12 = 16.67%
      mockPrisma.notificationLog.count
        .mockResolvedValueOnce(10) // totalSent
        .mockResolvedValueOnce(2)  // totalFailed
        .mockResolvedValueOnce(4); // sentLast24h

      const stats = await service.getEmailStats();

      expect(stats.totalSent).toBe(10);
      expect(stats.totalFailed).toBe(2);
      expect(stats.sentLast24h).toBe(4);
      expect(stats.failureRatePercent).toBe(16.67);
    });

    it('should return 0% failure rate when total is 0', async () => {
      mockPrisma.notificationLog.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const stats = await service.getEmailStats();

      expect(stats.totalSent).toBe(0);
      expect(stats.totalFailed).toBe(0);
      expect(stats.failureRatePercent).toBe(0);
    });
  });
});
