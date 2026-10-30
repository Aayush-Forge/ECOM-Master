import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { Public } from '../auth/decorators/public.decorator';

@Controller('')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post('admin/create-categories')
  @Roles(ROLES.EDITOR)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Public()
  @Get('categories')
  findAll() {
    return this.categoriesService.findAll();
  }

  @Roles(ROLES.READ_ONLY)
  @Get('admin/all-categories')
  findAllAdmin() {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get('categories/:id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Roles(ROLES.READ_ONLY)
  @Get('admin/categories/:id')
  findOneAdmin(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch('admin/update-categories/:id')
  @Roles(ROLES.EDITOR)
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete('admin/delete-categories/:id')
  @Roles(ROLES.EDITOR)
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
