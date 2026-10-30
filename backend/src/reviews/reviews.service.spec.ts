import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      order: {
        findFirst: jest.fn(),
      },
      review: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  it('should throw NotFoundException if product does not exist', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        productId: 'prod-uuid',
        customerName: 'John',
        stars: 5,
        description: 'Great',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException if order is not delivered or not found', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-uuid' });
    prisma.order.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        productId: 'prod-uuid',
        customerName: 'John',
        email: 'john@example.com',
        stars: 5,
        description: 'Great',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw ConflictException if review already exists from customer', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-uuid' });
    prisma.order.findFirst.mockResolvedValue({ id: 'order-1', orderNumber: 'SRI-1' });
    prisma.review.findFirst.mockResolvedValue({ id: 'rev-existing' });

    await expect(
      service.create({
        productId: 'prod-uuid',
        customerName: 'John',
        email: 'john@example.com',
        stars: 5,
        description: 'Great',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should create review if product exists and order is delivered', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-uuid' });
    prisma.order.findFirst.mockResolvedValue({ id: 'order-1', orderNumber: 'SRI-1' });
    prisma.review.findFirst.mockResolvedValue(null);
    prisma.review.create.mockResolvedValue({ id: 'rev-uuid', stars: 5, isVerifiedBuyer: true });

    const result = await service.create({
      productId: 'prod-uuid',
      customerName: 'John',
      email: 'john@example.com',
      stars: 5,
      description: 'Great',
    });

    expect(result).toEqual({ id: 'rev-uuid', stars: 5, isVerifiedBuyer: true });
    expect(prisma.review.create).toHaveBeenCalledWith({
      data: {
        productId: 'prod-uuid',
        customerName: 'John',
        customerEmail: 'john@example.com',
        customerPhone: undefined,
        orderId: 'order-1',
        stars: 5,
        description: 'Great',
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
  });

  it('should find reviews by productId', async () => {
    prisma.review.findMany.mockResolvedValue([{ id: 'rev-1' }]);

    const result = await service.findByProduct('prod-uuid');
    expect(result).toEqual([{ id: 'rev-1' }]);
  });

  it('should get top reviews ordered by stars and date', async () => {
    prisma.review.findMany.mockResolvedValue([{ id: 'rev-top', stars: 5 }]);

    const result = await service.getTopReviews(10);
    expect(result).toEqual([{ id: 'rev-top', stars: 5 }]);
    expect(prisma.review.findMany).toHaveBeenCalledWith({
      orderBy: [{ stars: 'desc' }, { createdAt: 'desc' }],
      take: 10,
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
  });

  it('should return product review summaries', async () => {
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'p-1',
        title: 'Lobhan Cone',
        sku: 'SKU-1',
        slug: 'lobhan',
        images: ['img1.jpg'],
        status: 'active',
        reviews: [
          { id: 'r-1', stars: 5, createdAt: new Date('2026-10-01') },
          { id: 'r-2', stars: 3, createdAt: new Date('2026-10-02') },
        ],
      },
    ]);

    const result = await service.getProductReviewSummaries();
    expect(result).toHaveLength(1);
    expect(result[0].reviewCount).toBe(2);
    expect(result[0].averageRating).toBe('4.0');
  });

  it('should find all reviews with pagination and count', async () => {
    prisma.review.findMany.mockResolvedValue([{ id: 'rev-1' }]);
    prisma.review.count.mockResolvedValue(1);

    const result = await service.findAll({ page: 1, perPage: 10 });
    expect(result).toEqual({
      items: [{ id: 'rev-1' }],
      total: 1,
      page: 1,
      perPage: 10,
      totalPages: 1,
    });
  });

  it('should delete review by id', async () => {
    prisma.review.findUnique.mockResolvedValue({ id: 'rev-1' });
    prisma.review.delete.mockResolvedValue({ id: 'rev-1' });

    const result = await service.remove('rev-1');
    expect(result).toEqual({ id: 'rev-1' });
  });

  it('should throw NotFoundException when deleting non-existent review', async () => {
    prisma.review.findUnique.mockResolvedValue(null);

    await expect(service.remove('rev-not-found')).rejects.toThrow(
      NotFoundException,
    );
  });
});
