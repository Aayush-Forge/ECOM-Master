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
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { TrackOrderDto } from './dto/track-order.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { Public } from '../auth/decorators/public.decorator';

@Controller('orders')
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Public()
  createOrder(
    @Body() dto: CreateOrderDto,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.ordersService.createOrder(dto, req.user?.userId);
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
  getMyOrderByNumber(
    @Req() req: { user: { userId: string } },
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.ordersService.getMyOrderByNumber(req.user.userId, orderNumber);
  }

  @Get('me/:id')
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
