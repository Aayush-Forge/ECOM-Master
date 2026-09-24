import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  ServiceUnavailableException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { DeleteProductImageDto } from './dto/delete-product-image.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { Public } from '../auth/decorators/public.decorator';
import { R2Service } from '../r2/r2.service';

@Controller('')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly r2Service: R2Service,
  ) {}

  @Post('admin/products/upload-image')
  @Roles(ROLES.EDITOR)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, callback) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              `Unsupported file type "${file.mimetype}". Allowed types: image/jpeg, image/png, image/webp.`,
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No image file provided.');
    }

    const ext =
      extname(file.originalname).toLowerCase() ||
      (file.mimetype === 'image/png'
        ? '.png'
        : file.mimetype === 'image/webp'
          ? '.webp'
          : '.jpg');
    const key = `products/${randomUUID()}${ext}`;

    try {
      await this.r2Service.uploadFile(key, file.buffer, file.mimetype);
      const url = this.r2Service.getPublicUrl(key);
      return { url };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Failed to upload product image for key "${key}": ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException(
        'Image upload storage service is unavailable. Please try again later.',
      );
    }
  }

  @Delete('admin/products/delete-image')
  @Roles(ROLES.EDITOR)
  async deleteImage(@Body() deleteProductImageDto: DeleteProductImageDto) {
    if (!deleteProductImageDto?.url) {
      throw new BadRequestException('Image URL is required.');
    }

    const key = this.extractKeyFromUrl(deleteProductImageDto.url);
    if (!key) {
      throw new BadRequestException('Invalid image URL format.');
    }

    try {
      await this.r2Service.deleteFile(key);
      return { success: true, message: 'Image deleted successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Failed to delete product image for url "${deleteProductImageDto.url}": ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException(
        'Image deletion storage service is unavailable. Please try again later.',
      );
    }
  }

  private extractKeyFromUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('products/')) return url;
    try {
      const parsed = new URL(url);
      return parsed.pathname.replace(/^\/+/, '');
    } catch {
      const index = url.indexOf('products/');
      if (index !== -1) {
        return url.slice(index);
      }
      return url;
    }
  }

  @Post('admin/create-products')
  @Roles(ROLES.EDITOR)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Public()
  @Get('all-products')
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('per_page', new ParseIntPipe({ optional: true })) perPage?: number,
  ) {
    return this.productsService.findAll(page, perPage);
  }

  @Public()
  @Get('products/:id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch('admin/update-products/:id')
  @Roles(ROLES.EDITOR)
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete('admin/delete-products/:id')
  @Roles(ROLES.EDITOR)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
