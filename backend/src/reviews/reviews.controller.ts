import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { CreateReviewDto } from './dto/create-review.dto';
import { FindReviewsQueryDto, GetTopReviewsQueryDto } from './dto/find-reviews-query.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Post()
  create(@Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(createReviewDto);
  }

  @Public()
  @Get('top')
  getTopReviews(@Query() query: GetTopReviewsQueryDto) {
    const take = typeof query?.getEffectiveLimit === 'function' ? query.getEffectiveLimit(10) : (query?.limit ?? query?.per_page ?? query?.perPage ?? 10);
    return this.reviewsService.getTopReviews(take);
  }

  @Roles(ROLES.EDITOR)
  @Get('products-summary')
  getProductReviewSummaries(@Query('search') search?: string) {
    return this.reviewsService.getProductReviewSummaries(search);
  }

  @Public()
  @Get()
  findAll(@Query() query: FindReviewsQueryDto) {
    if (query?.productId && !query?.search && !query?.stars && !query?.page && !query?.limit && !query?.perPage && !query?.per_page) {
      return this.reviewsService.findByProduct(query.productId);
    }

    const page = typeof query?.getEffectivePage === 'function' ? query.getEffectivePage() : (query?.page ?? 1);
    const perPage = typeof query?.getEffectiveLimit === 'function' ? query.getEffectiveLimit(20) : (query?.limit ?? query?.per_page ?? query?.perPage ?? 20);

    return this.reviewsService.findAll({
      productId: query?.productId,
      search: query?.search,
      stars: query?.stars,
      page,
      perPage,
    });
  }

  @Roles(ROLES.EDITOR)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}
