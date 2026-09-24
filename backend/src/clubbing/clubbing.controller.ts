import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ClubbingService, CartItemDiscountInput } from './clubbing.service';
import { CreateClubbingRuleDto } from './dto/create-clubbing-rule.dto';
import { UpdateClubbingRuleDto } from './dto/update-clubbing-rule.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { Public } from '../auth/decorators/public.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';

@Controller('clubbing-rules')
@UseInterceptors(AuditLogInterceptor)
export class ClubbingController {
  constructor(private readonly clubbingService: ClubbingService) {}

  @Post()
  @Roles(ROLES.EDITOR)
  @AuditLog('clubbing_rule.create')
  createRule(@Body() dto: CreateClubbingRuleDto) {
    return this.clubbingService.createRule(dto);
  }

  @Get()
  @Roles(ROLES.READ_ONLY)
  getAllRules() {
    return this.clubbingService.getAllRules();
  }

  @Get('active')
  @Public()
  getActiveRules() {
    return this.clubbingService.getActiveRules();
  }

  @Get(':id')
  @Roles(ROLES.READ_ONLY)
  getRuleById(@Param('id') id: string) {
    return this.clubbingService.getRuleById(id);
  }

  @Patch(':id')
  @Roles(ROLES.EDITOR)
  @AuditLog('clubbing_rule.update')
  updateRule(@Param('id') id: string, @Body() dto: UpdateClubbingRuleDto) {
    return this.clubbingService.updateRule(id, dto);
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
  bulkDelete(@Body() body: { ids: string[] }) {
    return this.clubbingService.bulkDelete(body.ids || []);
  }

  @Post('bulk-status')
  @Roles(ROLES.EDITOR)
  @AuditLog('clubbing_rule.bulk_status')
  bulkUpdateStatus(@Body() body: { ids: string[]; isActive: boolean }) {
    return this.clubbingService.bulkUpdateStatus(body.ids || [], body.isActive);
  }

  @Post('calculate')
  @Public()
  calculateDiscount(@Body() body: { cartItems: CartItemDiscountInput[] }) {
    return this.clubbingService.calculateCartDiscount(body.cartItems || []);
  }
}
