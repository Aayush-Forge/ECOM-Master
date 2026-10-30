import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ShippingSlabsService } from './shipping-slabs.service';
import { CreateShippingSlabDto } from './dto/create-shipping-slab.dto';
import { UpdateShippingSlabDto } from './dto/update-shipping-slab.dto';
import { CalculateShippingDto } from './dto/calculate-shipping.dto';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller('shipping-slabs')
export class ShippingSlabsController {
  constructor(private readonly shippingSlabsService: ShippingSlabsService) {}

  @Public()
  @Post()
  createSlab(@Body() dto: CreateShippingSlabDto) {
    return this.shippingSlabsService.createSlab(dto);
  }

  @Public()
  @Get()
  getAllSlabs() {
    return this.shippingSlabsService.getAllSlabs();
  }

  @Public()
  @Get('active')
  getActiveSlabs() {
    return this.shippingSlabsService.getActiveSlabs();
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('calculate')
  calculateRate(@Body() dto: CalculateShippingDto) {
    return this.shippingSlabsService.calculateRate(dto);
  }

  @Public()
  @Get(':id')
  getSlabById(@Param('id') id: string) {
    return this.shippingSlabsService.getSlabById(id);
  }

  @Public()
  @Patch(':id')
  updateSlab(@Param('id') id: string, @Body() dto: UpdateShippingSlabDto) {
    return this.shippingSlabsService.updateSlab(id, dto);
  }

  @Public()
  @Patch(':id/toggle')
  toggleStatus(@Param('id') id: string) {
    return this.shippingSlabsService.toggleStatus(id);
  }

  @Public()
  @Delete(':id')
  deleteSlab(@Param('id') id: string) {
    return this.shippingSlabsService.deleteSlab(id);
  }
}
