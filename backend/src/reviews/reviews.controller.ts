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
  getTopReviews(@Query('limit') limit?: string) {
    const take = limit ? parseInt(limit, 10) : 10;
    return this.reviewsService.getTopReviews(take);
  }

  @Roles(ROLES.EDITOR)
  @Get('products-summary')
  getProductReviewSummaries(@Query('search') search?: string) {
    return this.reviewsService.getProductReviewSummaries(search);
  }

  @Public()
  @Get()
  findAll(
    @Query('productId') productId?: string,
    @Query('search') search?: string,
    @Query('stars') stars?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    if (productId && !search && !stars && !page && !perPage) {
      return this.reviewsService.findByProduct(productId);
    }

    return this.reviewsService.findAll({
      productId,
      search,
      stars: stars ? parseInt(stars, 10) : undefined,
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 20,
    });
  }

  @Roles(ROLES.EDITOR)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}
