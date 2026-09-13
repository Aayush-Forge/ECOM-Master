import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(
    @Headers('authorization') authHeader?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    return this.cartService.getCart(authHeader, sessionToken);
  }

  @Post('items')
  addItem(
    @Body() createCartDto: CreateCartDto,
    @Headers('authorization') authHeader?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    return this.cartService.addItem(authHeader, sessionToken, createCartDto);
  }

  @Patch('items/:id')
  updateItem(
    @Param('id') id: string,
    @Body() updateCartDto: UpdateCartDto,
    @Headers('authorization') authHeader?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    return this.cartService.updateItem(
      authHeader,
      sessionToken,
      id,
      updateCartDto,
    );
  }

  @Delete('items/:id')
  removeItem(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    return this.cartService.removeItem(authHeader, sessionToken, id);
  }
}
