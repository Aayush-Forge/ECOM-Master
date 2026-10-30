import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

export interface FindReviewsQuery {
  productId?: string;
  search?: string;
  stars?: number;
  page?: number;
  perPage?: number;
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createReviewDto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: createReviewDto.productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const normalizedEmail = createReviewDto.email?.trim().toLowerCase();
    const rawPhoneDigits = createReviewDto.phone?.replace(/[^0-9]/g, '');
    const normalizedPhone =
      rawPhoneDigits && rawPhoneDigits.length >= 10
        ? rawPhoneDigits.slice(-10)
        : rawPhoneDigits;

    if (!normalizedEmail && !normalizedPhone) {
      throw new ForbiddenException(
        'Please provide a valid email or phone number used during checkout to verify your delivery.'
      );
    }

    const matchingDeliveredOrder = await this.prisma.order.findFirst({
      where: {
        status: OrderStatus.delivered,
        items: {
          some: { productId: createReviewDto.productId },
        },
        OR: [
          ...(normalizedEmail
            ? [
                {
                  email: {
                    equals: normalizedEmail,
                    mode: 'insensitive' as const,
                  },
                },
              ]
            : []),
          ...(normalizedPhone
            ? [
                {
                  addresses: {
                    some: {
                      phone: {
                        contains: normalizedPhone,
                      },
                    },
                  },
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });

    if (!matchingDeliveredOrder) {
      throw new ForbiddenException(
        'Only customers who have received this product can submit a review. Please ensure your order has been delivered and your email or phone matches your purchase.'
      );
    }

    const existingReview = await this.prisma.review.findFirst({
      where: {
        productId: createReviewDto.productId,
        OR: [
          ...(normalizedEmail ? [{ customerEmail: normalizedEmail }] : []),
          ...(normalizedPhone ? [{ customerPhone: normalizedPhone }] : []),
        ],
      },
    });

    if (existingReview) {
      throw new ConflictException(
        'You have already submitted a review for this product.'
      );
    }

    return this.prisma.review.create({
      data: {
        productId: createReviewDto.productId,
        customerName: createReviewDto.customerName,
        customerEmail: normalizedEmail,
        customerPhone: normalizedPhone,
        orderId: matchingDeliveredOrder.id,
        stars: createReviewDto.stars,
        description: createReviewDto.description,
        isVerifiedBuyer: true,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            sku: true,
            slug: true,
            images: true,
          },
        },
      },
    });
  }

  async findByProduct(productId: string) {
    return this.prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            sku: true,
            slug: true,
            images: true,
          },
        },
      },
    });
  }

  async getTopReviews(limit = 10) {
    const take = Math.min(50, Math.max(1, limit));
    return this.prisma.review.findMany({
      orderBy: [
        { stars: 'desc' },
        { createdAt: 'desc' },
      ],
      take,
      include: {
        product: {
          select: {
            id: true,
            title: true,
            sku: true,
            slug: true,
            images: true,
          },
        },
      },
    });
  }

  async getProductReviewSummaries(search?: string) {
    const productWhere: any = {};
    if (search && search.trim()) {
      const term = search.trim();
      productWhere.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where: productWhere,
      select: {
        id: true,
        title: true,
        sku: true,
        slug: true,
        images: true,
        status: true,
        reviews: {
          select: {
            id: true,
            stars: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product) => {
      const reviewCount = product.reviews.length;
      const sum = product.reviews.reduce((acc, r) => acc + r.stars, 0);
      const averageRating = reviewCount > 0 ? (sum / reviewCount).toFixed(1) : '0.0';
      const latestReviewDate = reviewCount > 0
        ? product.reviews.reduce((latest, r) => (r.createdAt > latest ? r.createdAt : latest), product.reviews[0].createdAt)
        : null;

      return {
        id: product.id,
        title: product.title,
        sku: product.sku,
        slug: product.slug,
        images: product.images,
        status: product.status,
        reviewCount,
        averageRating,
        latestReviewDate,
      };
    });
  }

  async findAll(query: FindReviewsQuery = {}) {
    const { productId, search, stars, page = 1, perPage = 20 } = query;

    const where: any = {};

    if (productId) {
      where.productId = productId;
    }

    if (stars && stars >= 1 && stars <= 5) {
      where.stars = stars;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { customerName: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { product: { title: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const skip = Math.max(0, (page - 1) * perPage);
    const take = Math.min(100, Math.max(1, perPage));

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              sku: true,
              slug: true,
              images: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      perPage: take,
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.review.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Review with ID "${id}" not found`);
    }

    return this.prisma.review.delete({
      where: { id },
    });
  }
}
