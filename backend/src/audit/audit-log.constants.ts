export const AUDIT_LOG_METADATA_KEY = 'audit_log_metadata';

export interface AuditLogOptions {
  actionType: string;
  entityType?: string;
  getEntityId?: (req: any, res: any) => string;
  getBeforeValue?: (req: any) => Promise<any> | any;
  getAfterValue?: (req: any, res: any) => Promise<any> | any;
}

export interface AuditLogEntry {
  id?: string;
  timestamp?: Date;
  userId: string;
  userRole: string;
  actionType: string;
  entityType: string;
  entityId: string;
  beforeValue?: any;
  afterValue?: any;
  ipAddress?: string | null;
}

export interface AuditLogFilterDto {
  userId?: string;
  actionType?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}
