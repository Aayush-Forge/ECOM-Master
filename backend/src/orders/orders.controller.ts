import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';

@Controller('admin/orders')
@UseInterceptors(AuditLogInterceptor)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get(':id')
  @Roles(ROLES.READ_ONLY)
  getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Patch(':id/status')
  @Roles(ROLES.EDITOR)
  @AuditLog('order.status_changed')
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateOrderStatusDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.ordersService.updateStatus(
      id,
      body.toStatus,
      body.note,
      req.user.userId,
    );
  }
}
