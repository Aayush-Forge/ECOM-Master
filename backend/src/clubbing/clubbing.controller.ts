import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  ServiceUnavailableException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { ClubbingService } from './clubbing.service';
import { BulkIdsDto, BulkStatusDto } from './dto/clubbing-bulk.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { Public } from '../auth/decorators/public.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { R2Service } from '../r2/r2.service';

@Controller(['clubbing-rules', 'clubbing'])
@UseInterceptors(AuditLogInterceptor)
export class ClubbingController {
  private readonly logger = new Logger(ClubbingController.name);

  constructor(
    private readonly clubbingService: ClubbingService,
    private readonly r2Service: R2Service,
  ) {}

  @Post('upload-banner')
  @Roles(ROLES.EDITOR)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, callback) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              `Unsupported file type "${file.mimetype}". Allowed types: image/jpeg, image/png, image/webp.`,
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadBanner(@UploadedFile() file?: any) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No banner image file provided.');
    }

    const ext =
      extname(file.originalname).toLowerCase() ||
      (file.mimetype === 'image/png'
        ? '.png'
        : file.mimetype === 'image/webp'
          ? '.webp'
          : '.jpg');
    const key = `clubbings/${randomUUID()}${ext}`;

    try {
      await this.r2Service.uploadFile(key, file.buffer, file.mimetype);
      const url = this.r2Service.getPublicUrl(key);
      return { url, key };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Failed to upload banner image for key "${key}": ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException(
        'Banner upload storage service is unavailable. Please try again later.',
      );
    }
  }

  @Post()
  @Roles(ROLES.EDITOR)
  @AuditLog('clubbing_rule.create')
  createRule(@Body() dto: any) {
    return this.clubbingService.createRule(dto);
  }

  @Get()
  @Public()
  getAllRules() {
    return this.clubbingService.getAllRules();
  }

  @Get('active')
  @Public()
  getActiveRules() {
    return this.clubbingService.getActiveRules(false);
  }

  @Get(':id')
  @Public()
  getRuleById(@Param('id') id: string) {
    return this.clubbingService.getRuleById(id);
  }

  @Patch(':id')
  @Roles(ROLES.EDITOR)
  @AuditLog('clubbing_rule.update')
  updateRule(@Param('id') id: string, @Body() dto: any) {
    return this.clubbingService.updateRule(id, dto);
  }

  @Patch(':id/toggle')
  @Roles(ROLES.EDITOR)
  @AuditLog('clubbing_rule.toggle')
  toggleRulePatch(@Param('id') id: string) {
    return this.clubbingService.toggleRule(id);
  }

  @Post(':id/toggle')
  @Roles(ROLES.EDITOR)
  @AuditLog('clubbing_rule.toggle')
  toggleRulePost(@Param('id') id: string) {
    return this.clubbingService.toggleRule(id);
  }

  @Delete(':id')
  @Roles(ROLES.EDITOR)
  @AuditLog('clubbing_rule.delete')
  deleteRule(@Param('id') id: string) {
    return this.clubbingService.deleteRule(id);
  }

  @Post('bulk-delete')
  @Roles(ROLES.EDITOR)
  @AuditLog('clubbing_rule.bulk_delete')
  bulkDelete(@Body() body: BulkIdsDto) {
    return this.clubbingService.bulkDelete(body.ids || []);
  }

  @Post('bulk-status')
  @Roles(ROLES.EDITOR)
  @AuditLog('clubbing_rule.bulk_status')
  bulkUpdateStatus(@Body() body: BulkStatusDto) {
    return this.clubbingService.bulkUpdateStatus(body.ids || [], body.isActive);
  }

  @Post('calculate')
  @Public()
  async calculateDiscount(@Body() body: any) {
    const cartItems = body.cartItems || [];
    const result = await this.clubbingService.calculateCartDiscount(
      cartItems,
      body.couponCode,
    );
    return {
      discountTotal: result.discountTotal,
      appliedCouponCode: result.appliedCouponCode,
      appliedRuleId: result.appliedRuleId,
    };
  }
}
