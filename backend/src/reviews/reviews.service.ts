import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createReviewDto: CreateReviewDto) {
    const product = await this.prismaService.product.findUnique({
      where: { id: createReviewDto.productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prismaService.review.create({
      data: {
        productId: createReviewDto.productId,
        customerName: createReviewDto.customerName,
        stars: createReviewDto.stars,
        description: createReviewDto.description,
      },
    });
  }
}
