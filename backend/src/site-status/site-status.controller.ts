import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { SiteStatusService } from './site-status.service';
import { UpdateSiteStatusDto } from './dto/update-site-status.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller()
export class SiteStatusController {
  constructor(private readonly siteStatusService: SiteStatusService) {}

  @Public()
  @Get('site-status')
  async getStatus() {
    return this.siteStatusService.getStatus();
  }

  @Patch('admin/site-status')
  @Roles('admin')
  async updateStatus(@Body() dto: UpdateSiteStatusDto, @Req() req: any) {
    const ip = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress;
    return this.siteStatusService.updateStatus(dto, req.user, ip);
  }
}
