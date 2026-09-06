import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma.service';
@Injectable()
export class CategoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    if (createCategoryDto.parentId) {
      const parent = await this.prismaService.category.findUnique({
        where: { id: createCategoryDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    try {
      return await this.prismaService.category.create({
        data: {
          name: createCategoryDto.name,
          slug: createCategoryDto.slug,
          parentId: createCategoryDto.parentId,
        },
      });
    } catch (error) {
      console.log(error);

      throw new ConflictException('Slug already exists');
    }
  }

  async findAll() {
    return this.prismaService.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prismaService.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    if (updateCategoryDto.parentId) {
      if (updateCategoryDto.parentId === id) {
        throw new ConflictException('A category cannot be its own parent');
      }

      const parent = await this.prismaService.category.findUnique({
        where: { id: updateCategoryDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    try {
      return await this.prismaService.category.update({
        where: { id },
        data: {
          name: updateCategoryDto.name,
          slug: updateCategoryDto.slug,
          parentId: updateCategoryDto.parentId,
        },
      });
    } catch (error) {
      console.log(error);

      throw new NotFoundException('Category not found');
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.category.delete({
        where: { id },
      });
    } catch (error) {
      console.log(error);
      throw new NotFoundException('Category not found');

      // if (error.code === 'P2003') {
      //   throw new ConflictException(
      //     'Cannot delete a category that has subcategories or products assigned to it',
      //   );
      // }
    }
  }
}
