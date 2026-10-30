import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ROLES } from '../auth/roles.constants.js';
import { AdminEmailTemplatesService } from './admin-email-templates.service.js';
import {
  UpdateEmailTemplateDto,
  PreviewEmailTemplateDto,
} from './dto/update-email-template.dto.js';

@Controller('admin/email')
@Roles(ROLES.ADMIN)
export class AdminEmailTemplatesController {
  constructor(
    private readonly templatesService: AdminEmailTemplatesService,
  ) {}

  @Get('templates')
  @Roles(ROLES.ADMIN)
  async getTemplates() {
    return this.templatesService.getAllTemplates();
  }

  @Patch('templates/:key')
  @Roles(ROLES.ADMIN)
  async updateTemplate(
    @Param('key') key: string,
    @Body() dto: UpdateEmailTemplateDto,
    @Req() req: any,
  ) {
    const user = req?.user;
    const ipAddress = req?.ip || req?.connection?.remoteAddress;
    return this.templatesService.updateTemplate(key, dto, user, ipAddress);
  }

  @Post('templates/:key/preview')
  @Roles(ROLES.ADMIN)
  async previewTemplate(
    @Param('key') key: string,
    @Body() dto: PreviewEmailTemplateDto,
  ) {
    return this.templatesService.previewTemplate(key, dto);
  }
}
