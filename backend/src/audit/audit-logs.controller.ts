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
    @Query('userId') userId?: string,
    @Query('actionType') actionType?: string,
    @Query('entityType') entityType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<AuditLogEntry[]> {
    const user = req?.user;

    // Hard explicit strict role check: must be strictly 'admin'
    if (!user?.role || user.role.toLowerCase() !== ROLES.ADMIN) {
      throw new ForbiddenException(
        'Access denied: Strict admin privileges required to view audit logs.',
      );
    }

    const filters: AuditLogFilterDto = {
      userId,
      actionType,
      entityType,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    return this.auditLogsService.findAll(filters);
  }
}
