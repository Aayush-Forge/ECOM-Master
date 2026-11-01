import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit/audit-logs.service';
import { UpdateSiteStatusDto } from './dto/update-site-status.dto';

@Injectable()
export class SiteStatusService {
  private readonly logger = new Logger(SiteStatusService.name);
  private static readonly SETTING_ID = 'default';

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async getStatus(): Promise<{ isMaintenance: boolean; message: string | null }> {
    try {
      const setting = await this.prisma.siteSetting.findUnique({
        where: { id: SiteStatusService.SETTING_ID },
      });

      if (!setting) {
        return { isMaintenance: false, message: null };
      }

      return {
        isMaintenance: setting.isMaintenance,
        message: setting.message,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve site status, defaulting to live', error);
      return { isMaintenance: false, message: null };
    }
  }

  async updateStatus(
    dto: UpdateSiteStatusDto,
    user: any,
    ipAddress?: string,
  ): Promise<{ isMaintenance: boolean; message: string | null }> {
    const current = await this.getStatus();

    const updated = await this.prisma.siteSetting.upsert({
      where: { id: SiteStatusService.SETTING_ID },
      create: {
        id: SiteStatusService.SETTING_ID,
        isMaintenance: dto.isMaintenance,
        message: dto.message || null,
      },
      update: {
        isMaintenance: dto.isMaintenance,
        message: dto.message !== undefined ? (dto.message || null) : current.message,
      },
    });

    try {
      await this.auditLogsService.createLog({
        userId: user?.id || user?.userId || 'unknown',
        userRole: user?.role || 'admin',
        actionType: 'SITE_STATUS_UPDATE',
        entityType: 'SiteSetting',
        entityId: SiteStatusService.SETTING_ID,
        beforeValue: JSON.stringify(current),
        afterValue: JSON.stringify({
          isMaintenance: updated.isMaintenance,
          message: updated.message,
        }),
        ipAddress: ipAddress || null,
      });
    } catch (auditErr) {
      this.logger.warn('Failed to record audit log for site status update', auditErr);
    }

    return {
      isMaintenance: updated.isMaintenance,
      message: updated.message,
    };
  }
}
