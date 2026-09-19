import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';

@Controller('orders')
@Roles(ROLES.CUSTOMER)
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('me')
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
    @Param('id') id: string,
  ) {
    return this.ordersService.getMyOrderById(req.user.userId, id);
  }
}
