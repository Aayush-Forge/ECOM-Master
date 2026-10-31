import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { RefundWebhookDto } from './dto/refund-webhook.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { Public } from '../auth/decorators/public.decorator';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';

@Controller('admin/orders')
@UseInterceptors(AuditLogInterceptor)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles(ROLES.READ_ONLY)
  getAllOrders(@Query() query: GetOrdersQueryDto) {
    return this.ordersService.getAllOrders(
      query.status,
      query.page,
      query.per_page,
      query.search,
      query.dateFrom,
      query.dateTo,
      query.sortBy,
      query.sortOrder,
    );
  }

  @Get(':id')
  @Roles(ROLES.READ_ONLY)
  getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Patch(':id/status')
  @Roles(ROLES.READ_ONLY)
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
      body.trackingUrl,
      body.trackingNumber,
    );
  }

  @Public()
  @Get(':id/invoice')
  getOrderInvoice(@Param('id') id: string, @Query('format') format?: string) {
    return this.ordersService.getOrderInvoice(id, format);
  }

  @Public()
  @Get(':id/shipping-label')
  getOrderShippingLabel(@Param('id') id: string, @Query('format') format?: string) {
    return this.ordersService.getOrderShippingLabel(id, format);
  }

  @Public()
  @Post('webhook/refund')
  @HttpCode(HttpStatus.OK)
  handleRefundWebhook(
    @Body() dto: RefundWebhookDto,
    @Headers('x-razorpay-signature') signature?: string,
  ) {
    return this.ordersService.handleRefundWebhook(dto, signature);
  }
}
