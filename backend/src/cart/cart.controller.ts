import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Public } from '../auth/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('cart')
@Public()
@UseGuards(OptionalJwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  createCart(@Req() req: any) {
    const customerId = req?.user?.userId || null;
    return this.cartService.createCart(customerId);
  }

  @Get(':id')
  getCart(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('x-cart-token') cartToken?: string,
    @Query('couponCode') couponCode?: string,
    @Req() req?: any,
  ) {
    return this.cartService.getCart(id, cartToken, req?.user, couponCode);
  }

  @Post(':id/items')
  addItem(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddCartItemDto,
    @Headers('x-cart-token') cartToken?: string,
    @Req() req?: any,
  ) {
    return this.cartService.addItem(id, dto, cartToken, req?.user);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() dto: UpdateCartItemDto,
    @Headers('x-cart-token') cartToken?: string,
    @Req() req?: any,
  ) {
    return this.cartService.updateItem(id, itemId, dto, cartToken, req?.user);
  }

  @Delete(':id/items/:itemId')
  removeItem(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Headers('x-cart-token') cartToken?: string,
    @Req() req?: any,
  ) {
    return this.cartService.removeItem(id, itemId, cartToken, req?.user);
  }
}
