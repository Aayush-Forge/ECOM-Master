import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RefundWebhookDto } from './dto/refund-webhook.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Public()
  @Get()
  getAllOrders() {
    return this.ordersService.getAllOrders();
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
  @Get(':id')
  getOrder(@Param('id') id: string) {
    return this.ordersService.getOrderOrMock(id);
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