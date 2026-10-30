import { SetMetadata } from '@nestjs/common';
import { AUDIT_LOG_METADATA_KEY, AuditLogOptions } from '../audit-log.constants';

/**
 * Decorator to declare automated audit logging on a mutation endpoint.
 *
 * Usage:
 *   @AuditLog('product.price_updated')
 *   @AuditLog({ actionType: 'order.status_changed', entityType: 'order' })
 */
export function AuditLog(optionsOrAction: string | AuditLogOptions) {
  const options: AuditLogOptions =
    typeof optionsOrAction === 'string'
      ? { actionType: optionsOrAction }
      : optionsOrAction;

  return SetMetadata(AUDIT_LOG_METADATA_KEY, options);
}
