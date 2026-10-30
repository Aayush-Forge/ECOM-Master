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

  async invalidateCache(slug?: string): Promise<void> {
    if (this.cacheService) {
      await this.cacheService.invalidatePattern('cache:categories:*');
      await this.cacheService.invalidatePattern('cache:products:*');
    }

    const storefrontUrl = process.env.STOREFRONT_INTERNAL_URL || process.env.STOREFRONT_URL || 'http://localhost:3000';
    const secret = process.env.REVALIDATE_SECRET || 'sridattam-revalidate-secret-2026';
    try {
      await fetch(`${storefrontUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': secret,
        },
        body: JSON.stringify({ tag: 'categories', path: slug ? `/categories/${slug}` : undefined }),
      });
    } catch {
      // Best-effort non-blocking storefront ISR notification
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
          description: createCategoryDto.description,
          image: createCategoryDto.image,
          metaTitle: createCategoryDto.metaTitle,
          metaDescription: createCategoryDto.metaDescription,
        },
      });
      await this.invalidateCache(created.slug);
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

  async findOne(idOrSlug: string) {
    if (this.cacheService) {
      return this.cacheService.getOrSet(`cache:categories:item:${idOrSlug}`, 300, async () => {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);
        const category = await this.prismaService.category.findFirst({
          where: isUuid ? { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug },
        });
        if (!category) {
          throw new NotFoundException('Category not found');
        }
        return category;
      });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);
    const category = await this.prismaService.category.findFirst({
      where: isUuid ? { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug },
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
          ...(updateCategoryDto.description !== undefined && { description: updateCategoryDto.description }),
          ...(updateCategoryDto.image !== undefined && { image: updateCategoryDto.image }),
          ...(updateCategoryDto.metaTitle !== undefined && { metaTitle: updateCategoryDto.metaTitle }),
          ...(updateCategoryDto.metaDescription !== undefined && { metaDescription: updateCategoryDto.metaDescription }),
        },
      });
      await this.invalidateCache(updated.slug);
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
      await this.invalidateCache(deleted.slug);
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
