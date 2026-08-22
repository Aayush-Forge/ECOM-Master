import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditLogsService } from '../audit-logs.service';
import { AUDIT_LOG_METADATA_KEY } from '../audit-log.constants';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let reflector: jest.Mocked<Reflector>;
  let auditLogsService: AuditLogsService;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    auditLogsService = new AuditLogsService();
    jest.spyOn(auditLogsService, 'createLog');

    interceptor = new AuditLogInterceptor(reflector, auditLogsService);
  });

  const createMockContext = ({
    user = { id: 'usr_001', role: 'admin' },
    params = {},
    body = {},
    headers = {},
    method = 'POST',
    ip = '127.0.0.1',
    beforeValue = undefined as any,
  } = {}): ExecutionContext => {
    const req: any = {
      user,
      params,
      body,
      headers,
      method,
      ip,
      beforeValue,
    };

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  it('bypasses logging if no @AuditLog decorator metadata is present', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const context = createMockContext();
    const next: CallHandler = {
      handle: () => of({ success: true }),
    };

    const result$ = await interceptor.intercept(context, next);
    let emitted: any;
    result$.subscribe((val) => (emitted = val));

    expect(emitted).toEqual({ success: true });
    expect(auditLogsService.createLog).not.toHaveBeenCalled();
  });

  it('correctly creates an audit log on a product.price_updated mutation with before and after values', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      actionType: 'product.price_updated',
      entityType: 'product',
    });

    const before = { id: 'prod_001', basePrice: 499, salePrice: 449 };
    const context = createMockContext({
      user: { id: 'usr_admin', role: 'admin' },
      params: { id: 'prod_001' },
      method: 'PUT',
      beforeValue: before,
      headers: { 'x-forwarded-for': '203.0.113.195, 10.0.0.1' },
    });

    const updatedProduct = { id: 'prod_001', basePrice: 599, salePrice: 549 };
    const next: CallHandler = {
      handle: () => of(updatedProduct),
    };

    const result$ = await interceptor.intercept(context, next);
    await new Promise((resolve) => result$.subscribe(resolve));

    expect(auditLogsService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'usr_admin',
        userRole: 'admin',
        actionType: 'product.price_updated',
        entityType: 'product',
        entityId: 'prod_001',
        beforeValue: before,
        afterValue: updatedProduct,
        ipAddress: '203.0.113.195',
      }),
    );
  });

  it('sets beforeValue to null on creation actions and captures created afterValue', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      actionType: 'product.created',
      entityType: 'product',
    });

    const context = createMockContext({
      user: { id: 'usr_editor', role: 'editor' },
      body: { title: 'New Incense', basePrice: 299 },
      method: 'POST',
      headers: { 'x-forwarded-for': '198.51.100.42' },
    });

    const createdProduct = {
      id: 'prod_new_99',
      title: 'New Incense',
      basePrice: 299,
    };
    const next: CallHandler = {
      handle: () => of(createdProduct),
    };

    const result$ = await interceptor.intercept(context, next);
    await new Promise((resolve) => result$.subscribe(resolve));

    expect(auditLogsService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'usr_editor',
        userRole: 'editor',
        actionType: 'product.created',
        entityType: 'product',
        entityId: 'prod_new_99',
        beforeValue: null,
        afterValue: createdProduct,
        ipAddress: '198.51.100.42',
      }),
    );
  });

  it('sets afterValue to null on deletion actions and captures deleted beforeValue', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      actionType: 'product.deleted',
      entityType: 'product',
    });

    const before = { id: 'prod_del_01', title: 'Old Discontinued Product' };
    const context = createMockContext({
      user: { id: 'usr_admin', role: 'admin' },
      params: { id: 'prod_del_01' },
      method: 'DELETE',
      beforeValue: before,
      ip: '192.168.1.50',
    });

    const next: CallHandler = {
      handle: () => of({ success: true }),
    };

    const result$ = await interceptor.intercept(context, next);
    await new Promise((resolve) => result$.subscribe(resolve));

    expect(auditLogsService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'usr_admin',
        userRole: 'admin',
        actionType: 'product.deleted',
        entityType: 'product',
        entityId: 'prod_del_01',
        beforeValue: before,
        afterValue: null,
        ipAddress: '192.168.1.50',
      }),
    );
  });

  it('correctly captures order.status_changed and refund.issued actions', async () => {
    // 1. Order status change
    reflector.getAllAndOverride.mockReturnValue({
      actionType: 'order.status_changed',
      entityType: 'order',
    });

    const orderBefore = { id: 'ord_101', status: 'pending' };
    const orderAfter = { id: 'ord_101', status: 'processing' };
    const context1 = createMockContext({
      user: { id: 'usr_editor_2', role: 'editor' },
      params: { id: 'ord_101' },
      method: 'PATCH',
      beforeValue: orderBefore,
    });

    const result1$ = await interceptor.intercept(context1, {
      handle: () => of(orderAfter),
    });
    await new Promise((resolve) => result1$.subscribe(resolve));

    expect(auditLogsService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'usr_editor_2',
        userRole: 'editor',
        actionType: 'order.status_changed',
        entityType: 'order',
        entityId: 'ord_101',
        beforeValue: orderBefore,
        afterValue: orderAfter,
      }),
    );

    // 2. Refund issued
    reflector.getAllAndOverride.mockReturnValue({
      actionType: 'refund.issued',
      entityType: 'order',
    });

    const refundBefore = { id: 'ord_101', paymentStatus: 'paid' };
    const refundAfter = {
      id: 'ord_101',
      paymentStatus: 'refunded',
      amount: 1047,
    };
    const context2 = createMockContext({
      user: { id: 'usr_editor_2', role: 'editor' },
      params: { id: 'ord_101' },
      method: 'POST',
      beforeValue: refundBefore,
    });

    const result2$ = await interceptor.intercept(context2, {
      handle: () => of(refundAfter),
    });
    await new Promise((resolve) => result2$.subscribe(resolve));

    expect(auditLogsService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'usr_editor_2',
        userRole: 'editor',
        actionType: 'refund.issued',
        entityType: 'order',
        entityId: 'ord_101',
        beforeValue: refundBefore,
        afterValue: refundAfter,
      }),
    );
  });
});
