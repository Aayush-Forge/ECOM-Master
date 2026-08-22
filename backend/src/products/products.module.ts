import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AuthGuard } from 'src/auth/auth.guard';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, AuthGuard],
})
export class ProductsModule {}
