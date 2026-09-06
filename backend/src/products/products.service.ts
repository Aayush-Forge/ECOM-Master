import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'src/generated/prisma/browser';
import { ProductStatus } from '../generated/prisma/enums';

@Injectable()
export class ProductsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const category = await this.prismaService.category.findUnique({
      where: { id: createProductDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    try {
      return await this.prismaService.product.create({
        data: {
          sku: createProductDto.sku,
          title: createProductDto.title,
          slug: createProductDto.slug,
          description: createProductDto.description,
          shortDescription: createProductDto.shortDescription,
          basePrice: createProductDto.basePrice,
          compareAtPrice: createProductDto.compareAtPrice,
          salePrice: createProductDto.salePrice,
          weight: createProductDto.weight,
          length: createProductDto.length,
          width: createProductDto.width,
          height: createProductDto.height,
          categoryId: createProductDto.categoryId,
          status: createProductDto.status,
          images: createProductDto.images ?? [],
          customFields: createProductDto.customFields as Prisma.InputJsonValue,
          stockQuantity: createProductDto.stockQuantity ?? 0,
        },
      });
    } catch (error) {
      throw new ConflictException('SKU or slug already exists');
    }
  }

  async findAll(page = 1, perPage = 20) {
    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.product.findMany({
        where: { status: ProductStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prismaService.product.count({
        where: { status: ProductStatus.ACTIVE },
      }),
    ]);
    return { data, meta: { page, per_page: perPage, total } };
  }

  async findOne(id: string) {
    const product = await this.prismaService.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    if (updateProductDto.categoryId) {
      const category = await this.prismaService.category.findUnique({
        where: { id: updateProductDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    try {
      return await this.prismaService.product.update({
        where: { id },
        data: {
          ...updateProductDto,
          customFields: updateProductDto.customFields as
            Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      throw new NotFoundException('Product not found');
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.product.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException('Product not found');
    }
  }
}
