import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../redis/cache.service.js';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prismaService: PrismaService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async invalidateCache(): Promise<void> {
    if (this.cacheService) {
      await this.cacheService.invalidatePattern('cache:categories:*');
      await this.cacheService.invalidatePattern('cache:products:*');
    }
  }

  async create(createCategoryDto: CreateCategoryDto) {
    if (createCategoryDto.parentId) {
      const parent = await this.prismaService.category.findUnique({
        where: { id: createCategoryDto.parentId },
      });
      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
    }

    try {
      const created = await this.prismaService.category.create({
        data: {
          name: createCategoryDto.name,
          slug: createCategoryDto.slug,
          parentId: createCategoryDto.parentId,
        },
      });
      await this.invalidateCache();
      return created;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Slug already exists');
      }
      throw error;
    }
  }

  async findAll() {
    if (this.cacheService) {
      return this.cacheService.getOrSet('cache:categories:all', 300, async () => {
        return this.prismaService.category.findMany({
          orderBy: { name: 'asc' },
        });
      });
    }

    return this.prismaService.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    if (this.cacheService) {
      return this.cacheService.getOrSet(`cache:categories:item:${id}`, 300, async () => {
        const category = await this.prismaService.category.findUnique({
          where: { id },
        });
        if (!category) {
          throw new NotFoundException('Category not found');
        }
        return category;
      });
    }

    const category = await this.prismaService.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    if (updateCategoryDto.parentId !== undefined && updateCategoryDto.parentId !== null) {
      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }

      const parent = await this.prismaService.category.findUnique({
        where: { id: updateCategoryDto.parentId },
      });
      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }

      // Walk upward with visited set and depth cap to detect circular reference
      const visited = new Set<string>([id]);
      let currentParentId: string | null = parent.parentId;
      let depth = 0;
      const MAX_DEPTH = 50;

      while (currentParentId && depth < MAX_DEPTH) {
        if (visited.has(currentParentId)) {
          throw new BadRequestException('Circular category parent relationship detected');
        }
        visited.add(currentParentId);

        const ancestor = await this.prismaService.category.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });

        if (!ancestor) break;
        currentParentId = ancestor.parentId;
        depth++;
      }
    }

    try {
      const updated = await this.prismaService.category.update({
        where: { id },
        data: {
          name: updateCategoryDto.name,
          slug: updateCategoryDto.slug,
          parentId: updateCategoryDto.parentId,
        },
      });
      await this.invalidateCache();
      return updated;
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundException('Category not found');
      }
      if (error?.code === 'P2002') {
        throw new ConflictException('Category slug already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const deleted = await this.prismaService.category.delete({
        where: { id },
      });
      await this.invalidateCache();
      return deleted;
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundException('Category not found');
      }
      if (error?.code === 'P2003') {
        throw new ConflictException('Cannot delete category with associated products or child categories');
      }
      throw error;
    }
  }
}
