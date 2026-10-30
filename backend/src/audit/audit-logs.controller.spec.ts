import { ForbiddenException } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { ROLES } from '../auth/roles.constants';

describe('AuditLogsController - Strict Admin Access Control', () => {
  let controller: AuditLogsController;
  let service: AuditLogsService;

  beforeEach(() => {
    service = new AuditLogsService();
    jest.spyOn(service, 'findAll').mockResolvedValue([
      {
        id: 'audit_01',
        userId: 'usr_001',
        userRole: 'admin',
        actionType: 'product.price_updated',
        entityType: 'product',
        entityId: 'prod_001',
        beforeValue: { basePrice: 499 },
        afterValue: { basePrice: 599 },
        ipAddress: '127.0.0.1',
      },
    ]);

    controller = new AuditLogsController(service);
  });

  describe('Strict Admin Authorization', () => {
    it('allows access to users with strict admin role (role === "admin")', async () => {
      const req = { user: { id: 'usr_001', role: ROLES.ADMIN } };
      const logs = await controller.getAuditLogs(req);

      expect(logs).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('strictly denies editor employee role (role === "editor") even though outranking customer', async () => {
      const req = { user: { id: 'usr_002', role: ROLES.EDITOR } };

      await expect(controller.getAuditLogs(req)).rejects.toThrow(
        ForbiddenException,
      );
      expect(service.findAll).not.toHaveBeenCalled();
    });

    it('strictly denies viewer employee role (role === "read_only")', async () => {
      const req = { user: { id: 'usr_003', role: ROLES.READ_ONLY } };

      await expect(controller.getAuditLogs(req)).rejects.toThrow(
        ForbiddenException,
      );
      expect(service.findAll).not.toHaveBeenCalled();
    });

    it('strictly denies customer role (role === "customer")', async () => {
      const req = { user: { id: 'usr_004', role: ROLES.CUSTOMER } };

      await expect(controller.getAuditLogs(req)).rejects.toThrow(
        ForbiddenException,
      );
      expect(service.findAll).not.toHaveBeenCalled();
    });

    it('strictly denies unauthenticated / missing role requests', async () => {
      await expect(controller.getAuditLogs({})).rejects.toThrow(
        ForbiddenException,
      );
      await expect(controller.getAuditLogs({ user: {} })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Append-Only Immutability Verification', () => {
    it('does not expose any update, put, patch, or delete methods on the controller or service', () => {
      const controllerProto = Object.getOwnPropertyNames(
        AuditLogsController.prototype,
      );
      const serviceProto = Object.getOwnPropertyNames(
        AuditLogsService.prototype,
      );

      // Verify no mutating/destructive endpoints or methods exist
      const forbiddenMethods = [
        'update',
        'updateLog',
        'delete',
        'deleteLog',
        'remove',
        'patch',
        'put',
        'clear',
      ];

      for (const method of forbiddenMethods) {
        expect(controllerProto).not.toContain(method);
        expect(serviceProto).not.toContain(method);
      }
    });
  });

  describe('Query parameter filtering', () => {
    it('passes filtering query parameters into service.findAll', async () => {
      const req = { user: { id: 'usr_001', role: 'admin' } };
      await controller.getAuditLogs(
        req,
        'usr_002',
        'product.price_updated',
        'product',
        '2025-01-01',
        '2025-12-31',
        '20',
        '0',
      );

      expect(service.findAll).toHaveBeenCalledWith({
        userId: 'usr_002',
        actionType: 'product.price_updated',
        entityType: 'product',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        limit: 20,
        offset: 0,
      });
    });
  });
});
