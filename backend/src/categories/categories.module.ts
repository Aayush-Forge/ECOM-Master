import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PrismaService } from 'src/prisma.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, AuthGuard, PrismaService],
})
export class CategoriesModule {}
