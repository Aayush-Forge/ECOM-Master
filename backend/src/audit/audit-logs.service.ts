import { Injectable, Optional } from '@nestjs/common';
import { AuditLogEntry, AuditLogFilterDto } from './audit-log.constants';

@Injectable()
export class AuditLogsService {
  // In-memory storage for testing/runtime or integration with Prisma
  private inMemoryLogs: AuditLogEntry[] = [];
  private prismaClient: any = null;

  constructor(@Optional() prisma?: any) {
    this.prismaClient = prisma || null;
  }

  /**
   * Append-only record creation.
   * Updates and deletes are intentionally omitted to preserve audit integrity.
   */
  async createLog(entry: AuditLogEntry): Promise<AuditLogEntry> {
    const record: AuditLogEntry = {
      id: entry.id || `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: entry.timestamp || new Date(),
      userId: entry.userId,
      userRole: entry.userRole,
      actionType: entry.actionType,
      entityType: entry.entityType,
      entityId: entry.entityId,
      beforeValue: entry.beforeValue ?? null,
      afterValue: entry.afterValue ?? null,
      ipAddress: entry.ipAddress ?? null,
    };

    if (this.prismaClient?.auditLog?.create) {
      try {
        const saved = await this.prismaClient.auditLog.create({
          data: {
            id: record.id,
            timestamp: record.timestamp,
            userId: record.userId,
            userRole: record.userRole,
            actionType: record.actionType,
            entityType: record.entityType,
            entityId: record.entityId,
            beforeValue: record.beforeValue,
            afterValue: record.afterValue,
            ipAddress: record.ipAddress,
          },
        });
        return saved;
      } catch {
        // Fallback to in-memory on error/offline DB
        this.inMemoryLogs.unshift(record);
        return record;
      }
    }

    this.inMemoryLogs.unshift(record);
    return record;
  }

  /**
   * Query audit logs with filtering support.
   */
  async findAll(filters: AuditLogFilterDto = {}): Promise<AuditLogEntry[]> {
    if (this.prismaClient?.auditLog?.findMany) {
      try {
        const where: any = {};
        if (filters.userId) where.userId = filters.userId;
        if (filters.actionType) where.actionType = filters.actionType;
        if (filters.entityType) where.entityType = filters.entityType;
        if (filters.startDate || filters.endDate) {
          where.timestamp = {};
          if (filters.startDate) where.timestamp.gte = new Date(filters.startDate);
          if (filters.endDate) where.timestamp.lte = new Date(filters.endDate);
        }

        return await this.prismaClient.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: filters.limit || 100,
          skip: filters.offset || 0,
        });
      } catch {
        // Fallback
      }
    }

    let results = [...this.inMemoryLogs];

    if (filters.userId) {
      results = results.filter((log) => log.userId === filters.userId);
    }
    if (filters.actionType) {
      results = results.filter((log) => log.actionType === filters.actionType);
    }
    if (filters.entityType) {
      results = results.filter((log) => log.entityType === filters.entityType);
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      results = results.filter(
        (log) => log.timestamp && new Date(log.timestamp).getTime() >= start,
      );
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime();
      results = results.filter(
        (log) => log.timestamp && new Date(log.timestamp).getTime() <= end,
      );
    }

    if (filters.offset) {
      results = results.slice(filters.offset);
    }
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }
}
