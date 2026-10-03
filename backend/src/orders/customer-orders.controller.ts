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

@Controller('orders')
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
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
  trackOrder(@Body() dto: TrackOrderDto) {
    return this.ordersService.trackOrder(dto.orderNumber, dto.phone, dto.email);
  }

  @Get('me')
  @Roles(ROLES.CUSTOMER)
  getMyOrders(
    @Req() req: { user: { userId: string } },
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('per_page', new ParseIntPipe({ optional: true })) perPage?: number,
  ) {
    return this.ordersService.getMyOrders(req.user.userId, page, perPage);
  }

  @Get('me/by-number/:orderNumber')
  @Roles(ROLES.CUSTOMER)
  getMyOrderByNumber(
    @Req() req: { user: { userId: string } },
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.ordersService.getMyOrderByNumber(req.user.userId, orderNumber);
  }

  @Get('me/:id')
  @Roles(ROLES.CUSTOMER)
  getMyOrderById(
    @Req() req: { user: { userId: string } },
    @Param('id', new ParseUUIDPipe({ optional: true })) id: string,
  ) {
    return this.ordersService.getMyOrderById(req.user.userId, id);
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

