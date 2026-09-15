import { Reflector } from '@nestjs/core';
import { SampleMutationsFixtureController } from './sample-mutations.controller';
import { AuditLogInterceptor } from '../interceptors/audit-log.interceptor';
import { AuditLogsService } from '../audit-logs.service';
import { AUDIT_LOG_METADATA_KEY } from '../audit-log.constants';

describe('SampleMutationsFixtureController - Decorator & Interceptor Wiring', () => {
  let controller: SampleMutationsFixtureController;
  let reflector: Reflector;
  let auditLogsService: AuditLogsService;

  beforeEach(() => {
    controller = new SampleMutationsFixtureController();
    reflector = new Reflector();
    auditLogsService = new AuditLogsService();
  });

  it('has @AuditLog metadata attached to product create, price update, and delete endpoints', () => {
    const createMeta = reflector.get(
      AUDIT_LOG_METADATA_KEY,
      controller.createProduct,
    );
    expect(createMeta).toEqual({ actionType: 'product.created' });

    const updatePriceMeta = reflector.get(
      AUDIT_LOG_METADATA_KEY,
      controller.updateProductPrice,
    );
    expect(updatePriceMeta).toEqual({ actionType: 'product.price_updated' });

    const deleteMeta = reflector.get(
      AUDIT_LOG_METADATA_KEY,
      controller.deleteProduct,
    );
    expect(deleteMeta).toEqual({ actionType: 'product.deleted' });
  });

  it('has @AuditLog metadata attached to order status and refund endpoints', () => {
    const orderStatusMeta = reflector.get(
      AUDIT_LOG_METADATA_KEY,
      controller.updateOrderStatus,
    );
    expect(orderStatusMeta).toEqual({ actionType: 'order.status_changed' });

    const refundMeta = reflector.get(
      AUDIT_LOG_METADATA_KEY,
      controller.issueRefund,
    );
    expect(refundMeta).toEqual({ actionType: 'refund.issued' });
  });

  it('has @AuditLog metadata attached to discount create, update, delete endpoints', () => {
    const discCreateMeta = reflector.get(
      AUDIT_LOG_METADATA_KEY,
      controller.createDiscount,
    );
    expect(discCreateMeta).toEqual({ actionType: 'discount.created' });

    const discUpdateMeta = reflector.get(
      AUDIT_LOG_METADATA_KEY,
      controller.updateDiscount,
    );
    expect(discUpdateMeta).toEqual({ actionType: 'discount.updated' });

    const discDeleteMeta = reflector.get(
      AUDIT_LOG_METADATA_KEY,
      controller.deleteDiscount,
    );
    expect(discDeleteMeta).toEqual({ actionType: 'discount.deleted' });
  });

  it('has @AuditLog metadata attached to user role change and inventory update endpoints', () => {
    const userRoleMeta = reflector.get(
      AUDIT_LOG_METADATA_KEY,
      controller.updateUserRole,
    );
    expect(userRoleMeta).toEqual({ actionType: 'user.role_changed' });

    const invMeta = reflector.get(
      AUDIT_LOG_METADATA_KEY,
      controller.updateInventory,
    );
    expect(invMeta).toEqual({ actionType: 'inventory.updated' });
  });
});
