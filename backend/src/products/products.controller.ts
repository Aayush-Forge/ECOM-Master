import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '../generated/prisma/enums.js';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('admin/create-products')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get('all-products')
  @UseGuards(AuthGuard)
  findAll(
    @Query('page', ParseIntPipe) page?: number,
    @Query('per_page', ParseIntPipe) perPage?: number,
  ) {
    return this.productsService.findAll(page, perPage);
  }

  @Get('products/:id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch('admin/products/:id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete('admin/products/:id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
