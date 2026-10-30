import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { Public } from '../auth/decorators/public.decorator';

@Controller('')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('admin/products')
  @Roles(ROLES.ADMIN)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Public()
  @Get('products')
  findAll(@Query() query: any) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get('products/:id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch('products/:id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete('products/:id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
