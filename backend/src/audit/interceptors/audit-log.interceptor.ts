import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  AUDIT_LOG_METADATA_KEY,
  AuditLogOptions,
} from '../audit-log.constants';
import { AuditLogsService } from '../audit-logs.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const auditOptions = this.reflector.getAllAndOverride<AuditLogOptions>(
      AUDIT_LOG_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If endpoint is not decorated with @AuditLog, proceed without logging
    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const actionType = auditOptions.actionType;
    const entityType =
      auditOptions.entityType || actionType.split('.')[0] || 'entity';

    // Extract client IP address prioritizing x-forwarded-for header behind reverse proxy
    const ipAddress = this.extractClientIp(request);

    // Snapshot user id and role at execution time
    const user = request.user || {};
    const userId = user.id || user.userId || user.sub || 'anonymous';
    const userRole = user.role || 'unknown';

    // Resolve pre-mutation beforeValue if available
    let beforeValue: any = null;
    if (auditOptions.getBeforeValue) {
      try {
        beforeValue = await auditOptions.getBeforeValue(request);
      } catch {
        beforeValue = null;
      }
    } else if (request.beforeValue !== undefined) {
      beforeValue = request.beforeValue;
    } else if (request.beforeEntity !== undefined) {
      beforeValue = request.beforeEntity;
    } else if (this.isCreationAction(actionType, request.method)) {
      beforeValue = null;
    } else if (request.body && request.body._beforeValue !== undefined) {
      beforeValue = request.body._beforeValue;
    }

    return next.handle().pipe(
      tap(async (response) => {
        try {
          // Resolve entityId
          let entityId = 'unknown';
          if (auditOptions.getEntityId) {
            entityId = auditOptions.getEntityId(request, response);
          } else {
            entityId =
              request.params?.id ||
              request.params?.productId ||
              request.params?.orderId ||
              request.params?.userId ||
              request.params?.discountId ||
              request.params?.entityId ||
              response?.id ||
              response?.data?.id ||
              request.body?.id ||
              request.body?.productId ||
              request.body?.orderId ||
              request.body?.userId ||
              'unknown';
          }

          // Resolve afterValue
          let afterValue: any = null;
          if (this.isDeletionAction(actionType, request.method)) {
            afterValue = null;
          } else if (auditOptions.getAfterValue) {
            afterValue = await auditOptions.getAfterValue(request, response);
          } else {
            afterValue = response !== undefined ? response : request.body;
          }

          // If it's a deletion and beforeValue wasn't set, fallback to request params/body
          if (this.isDeletionAction(actionType, request.method) && beforeValue === null) {
            beforeValue = request.body || { id: entityId };
          }

          await this.auditLogsService.createLog({
            userId: String(userId),
            userRole: String(userRole),
            actionType,
            entityType,
            entityId: String(entityId),
            beforeValue: beforeValue !== undefined ? beforeValue : null,
            afterValue: afterValue !== undefined ? afterValue : null,
            ipAddress,
          });
        } catch (err) {
          // Do not fail the business transaction if audit logging encounters an internal error
          console.error('AuditLogInterceptor failed to record log:', err);
        }
      }),
    );
  }

  private extractClientIp(request: any): string | null {
    if (!request) return null;

    // 1. Check x-forwarded-for header (first IP in chain is the real client)
    const forwarded =
      request.headers?.['x-forwarded-for'] ||
      request.headers?.['X-Forwarded-For'];
    if (forwarded) {
      const forwardedStr = Array.isArray(forwarded)
        ? forwarded[0]
        : String(forwarded);
      const clientIp = forwardedStr.split(',')[0].trim();
      if (clientIp) return clientIp;
    }

    // 2. Fall back to request.ip
    if (request.ip) return request.ip;

    // 3. Fall back to socket remote address
    if (request.socket?.remoteAddress) return request.socket.remoteAddress;

    return null;
  }

  private isCreationAction(actionType: string, httpMethod?: string): boolean {
    const act = actionType.toLowerCase();
    if (act.endsWith('.created') || act.includes('create')) return true;
    if (httpMethod?.toUpperCase() === 'POST' && !act.includes('refund')) return true;
    return false;
  }

  private isDeletionAction(actionType: string, httpMethod?: string): boolean {
    const act = actionType.toLowerCase();
    if (act.endsWith('.deleted') || act.includes('delete') || act.includes('remove')) {
      return true;
    }
    if (httpMethod?.toUpperCase() === 'DELETE') return true;
    return false;
  }
}
