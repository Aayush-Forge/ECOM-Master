import {
  Body,
  Controller,
  Get,
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
import { ROLES } from '../auth/roles.constants';
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
  getOrder(@Param('id', new ParseUUIDPipe({ optional: true })) id: string) {
    return this.ordersService.getOrderById(id);
  }
}

