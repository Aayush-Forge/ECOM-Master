import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ROLES } from '../auth/roles.constants.js';
import { AdminEmailService } from './admin-email.service.js';
import { GetEmailLogsQueryDto } from './dto/get-email-logs-query.dto.js';

@Controller('admin/email')
@Roles(ROLES.ADMIN)
export class AdminEmailLogsController {
  constructor(private readonly adminEmailService: AdminEmailService) {}

  @Get('logs')
  @Roles(ROLES.ADMIN)
  async getLogs(@Query() query: GetEmailLogsQueryDto) {
    return this.adminEmailService.getEmailLogs(query);
  }

  @Get('stats')
  @Roles(ROLES.ADMIN)
  async getStats() {
    return this.adminEmailService.getEmailStats();
  }

  @Post('logs/:id/retry')
  @Roles(ROLES.ADMIN)
  async retryLog(@Param('id') id: string, @Req() req: any) {
    const user = req?.user;
    const ipAddress = req?.ip || req?.connection?.remoteAddress;
    return this.adminEmailService.retryNotification(id, user, ipAddress);
  }
}
