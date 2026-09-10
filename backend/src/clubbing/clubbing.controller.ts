import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ClubbingService } from './clubbing.service';
import { CreateClubbingRuleDto } from './dto/create-clubbing-rule.dto';

@Controller('clubbing-rules')
export class ClubbingController {
  constructor(private readonly clubbingService: ClubbingService) {}

  @Post()
  createRule(@Body() dto: CreateClubbingRuleDto) {
    return this.clubbingService.createRule(dto);
  }

  @Get()
  getAllRules() {
    return this.clubbingService.getAllRules();
  }

  @Get('active')
  getActiveRules() {
    return this.clubbingService.getActiveRules();
  }

  @Delete(':id')
  deleteRule(@Param('id') id: string) {
    return this.clubbingService.deleteRule(id);
  }

  @Post('calculate')
  calculateDiscount(@Body() cartData: { cartItems: { productId: string, quantity: number, price: number }[] }) {
    return this.clubbingService.calculateCartDiscount(cartData.cartItems);
  }
}