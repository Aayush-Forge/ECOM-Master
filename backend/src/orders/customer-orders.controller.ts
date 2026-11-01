import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { TrackOrderDto } from './dto/track-order.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES, ROLE_RANKS } from '../auth/roles.constants';
import { Public } from '../auth/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { BlockDuringMaintenanceGuard } from '../site-status/guards/block-during-maintenance.guard';

@Controller('orders')
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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

  @Post()
  @Public()
  @UseGuards(OptionalJwtAuthGuard, BlockDuringMaintenanceGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  createOrder(
    @Body() dto: CreateOrderDto,
    @Req() req: any,
  ) {
    const customerId = req.user?.userId || null;
    return this.ordersService.createOrder(dto, customerId);
  }

  @Post('track')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  trackOrder(@Body() dto: TrackOrderDto) {
    return this.ordersService.trackOrder(dto.orderNumber, dto.phone, dto.email);
  }

  @Get('track')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  trackOrderGet(
    @Query('orderNumber') orderNumber?: string,
    @Query('phone') phone?: string,
    @Query('email') email?: string,
  ) {
    if (!orderNumber || (!phone && !email)) {
      throw new NotFoundException('Order not found');
    }
    return this.ordersService.trackOrder(orderNumber, phone || '', email);
  }

  @Get(':id')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  async getOrder(
    @Param('id', new ParseUUIDPipe({ optional: true })) id: string,
    @Req() req: any,
  ) {
    const user = req?.user;
    if (!user) {
      throw new NotFoundException('Order not found');
    }

    const userRank = ROLE_RANKS[user.role] ?? 0;
    const isStaff = userRank >= ROLE_RANKS[ROLES.READ_ONLY];

    const order = await this.ordersService.getOrderById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (isStaff) {
      return order;
    }

    if (order.customerId && order.customerId === user.userId) {
      return order;
    }

    throw new NotFoundException('Order not found');
  }
}

