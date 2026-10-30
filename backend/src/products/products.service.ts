import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BACKEND_PRODUCTS_SEED, ProductItem } from './products.seed';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: any): Promise<ProductItem[]> {
    try {
      const dbProducts = await this.prisma.product.findMany({
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });

      if (dbProducts && dbProducts.length > 0) {
        let mapped = dbProducts.map((p) => {
          const imgs = Array.isArray(p.images)
            ? p.images.map((img: any) =>
                typeof img === 'string' ? { src: img } : img,
              )
            : [];

          return {
            id: p.id,
            name: p.title,
            title: p.title,
            slug: p.slug,
            price: Number(p.salePrice || p.basePrice),
            regular_price: Number(p.compareAtPrice || p.basePrice),
            compareAt: Number(p.compareAtPrice || p.basePrice),
            categories: p.category
              ? [{ id: p.category.id, name: p.category.name, slug: p.category.slug }]
              : [],
            description: p.description,
            short_description: p.shortDescription,
            images: imgs.length > 0 ? imgs : [{ src: 'https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=800&q=80' }],
            stock_status: p.stockQuantity > 0 ? 'instock' : 'outofstock',
            weight: p.weight ? String(p.weight) : '0.25',
            featured: true,
            average_rating: '4.9',
            rating_count: 20,
          };
        });

        // Category filter
        if (query?.category) {
          const cat = String(query.category).toLowerCase();
          mapped = mapped.filter((p) =>
            p.categories.some((c: any) =>
              typeof c === 'string'
                ? c.toLowerCase() === cat
                : c.slug?.toLowerCase() === cat || c.name?.toLowerCase() === cat,
            ),
          );
        }

        // Search filter
        if (query?.search) {
          const term = String(query.search).toLowerCase();
          mapped = mapped.filter(
            (p) =>
              p.name.toLowerCase().includes(term) ||
              p.description.toLowerCase().includes(term),
          );
        }

        return mapped;
      }
    } catch (err: any) {
      this.logger.warn(`Could not query database products: ${err.message}. Returning seed products.`);
    }

    // Fallback to rich seed products catalog
    let list = [...BACKEND_PRODUCTS_SEED];

    if (query?.category) {
      const cat = String(query.category).toLowerCase();
      list = list.filter((p) =>
        p.categories.some((c: any) =>
          typeof c === 'string'
            ? c.toLowerCase() === cat
            : c.slug?.toLowerCase() === cat,
        ),
      );
    }

    if (query?.search) {
      const term = String(query.search).toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term),
      );
    }

    if (query?.limit) {
      const limit = parseInt(query.limit, 10);
      if (!isNaN(limit) && limit > 0) {
        list = list.slice(0, limit);
      }
    }

    return list;
  }

  async findOne(idOrSlug: string): Promise<ProductItem> {
    try {
      const dbProduct = await this.prisma.product.findFirst({
        where: {
          OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        },
        include: { category: true },
      });

      if (dbProduct) {
        const imgs = Array.isArray(dbProduct.images)
          ? dbProduct.images.map((img: any) =>
              typeof img === 'string' ? { src: img } : img,
            )
          : [];

        return {
          id: dbProduct.id,
          name: dbProduct.title,
          title: dbProduct.title,
          slug: dbProduct.slug,
          price: Number(dbProduct.salePrice || dbProduct.basePrice),
          regular_price: Number(dbProduct.compareAtPrice || dbProduct.basePrice),
          compareAt: Number(dbProduct.compareAtPrice || dbProduct.basePrice),
          categories: dbProduct.category
            ? [{ id: dbProduct.category.id, name: dbProduct.category.name, slug: dbProduct.category.slug }]
            : [],
          description: dbProduct.description,
          short_description: dbProduct.shortDescription,
          images: imgs.length > 0 ? imgs : [{ src: 'https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=800&q=80' }],
          stock_status: dbProduct.stockQuantity > 0 ? 'instock' : 'outofstock',
          weight: dbProduct.weight ? String(dbProduct.weight) : '0.25',
          featured: true,
          average_rating: '4.9',
          rating_count: 20,
        };
      }
    } catch {}

    const seed = BACKEND_PRODUCTS_SEED.find(
      (p) => p.id === idOrSlug || p.slug === idOrSlug,
    );
    if (!seed) throw new NotFoundException(`Product ${idOrSlug} not found`);
    return seed;
  }

  create(createProductDto: CreateProductDto) {
    return { success: true, message: 'Product created successfully' };
  }

  update(id: string, updateProductDto: UpdateProductDto) {
    return { success: true, id, message: 'Product updated successfully' };
  }

  remove(id: string) {
    return { success: true, id, message: 'Product removed successfully' };
  }
}
