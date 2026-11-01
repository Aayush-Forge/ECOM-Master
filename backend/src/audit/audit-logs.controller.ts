import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Req,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { AuditLogEntry, AuditLogFilterDto } from './audit-log.constants';
import { AuditLogsService } from './audit-logs.service';
import { GetAuditLogsQueryDto } from './dto/get-audit-logs-query.dto';

/**
 * Controller for retrieving audit logs.
 *
 * Strict Admin-Only Access:
 * Visible solely to users with role === 'admin'.
 * Employees (editor, read_only) and customers are explicitly denied.
 * Append-only by design: no update or delete routes exist.
 *
 * NOTE: JwtAuthGuard + RolesGuard are applied globally via APP_GUARD.
 * No explicit @UseGuards() is needed.
 */
@Controller('audit-logs')
@Roles(ROLES.ADMIN)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async getAuditLogs(
    @Req() req: any,
    @Query() query: GetAuditLogsQueryDto,
    actionType?: string,
    entityType?: string,
    startDate?: string,
    endDate?: string,
    limit?: string,
    offset?: string,
  ): Promise<AuditLogEntry[]> {
    const user = req?.user;

    // Hard explicit strict role check: must be strictly 'admin'
    if (!user?.role || user.role.toLowerCase() !== ROLES.ADMIN) {
      throw new ForbiddenException(
        'Access denied: Strict admin privileges required to view audit logs.',
      );
    }

    let filters: AuditLogFilterDto;
    if (typeof query === 'string') {
      filters = {
        userId: query,
        actionType,
        entityType,
        startDate,
        endDate,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      };
    } else {
      const q = query ?? new GetAuditLogsQueryDto();
      const effLimit = typeof q.getEffectiveLimit === 'function' ? q.getEffectiveLimit(100) : (q.limit ?? 100);
      const effPage = typeof q.getEffectivePage === 'function' ? q.getEffectivePage() : (q.page ?? 1);
      const effOffset = q.offset ?? (effPage - 1) * effLimit;

      filters = {
        userId: q.userId,
        actionType: q.actionType,
        entityType: q.entityType,
        startDate: q.startDate,
        endDate: q.endDate,
        limit: effLimit,
        offset: effOffset,
      };
    }

    return this.auditLogsService.findAll(filters);
  }
}
