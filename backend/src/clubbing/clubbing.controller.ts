import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ClubbingService } from './clubbing.service';
import { CreateClubbingRuleDto } from './dto/create-clubbing-rule.dto';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller(['clubbing-rules', 'clubbing'])
export class ClubbingController {
  constructor(private readonly clubbingService: ClubbingService) {}

  @Public()
  @Post()
  createRule(@Body() dto: CreateClubbingRuleDto): Promise<any> {
    return this.clubbingService.createRule(dto);
  }

  @Public()
  @Get()
  getAllRules(): Promise<any> {
    return this.clubbingService.getAllRules();
  }

  @Public()
  @Get('active')
  getActiveRules(): Promise<any> {
    return this.clubbingService.getActiveRules();
  }

  @Public()
  @Delete(':id')
  deleteRule(@Param('id') id: string): Promise<any> {
    return this.clubbingService.deleteRule(id);
  }

  @Public()
  @Post('calculate')
  calculateDiscount(@Body() cartData: { cartItems: { productId: string; quantity: number; price: number }[] }): Promise<any> {
    return this.clubbingService.calculateCartDiscount(cartData.cartItems);
  }
}