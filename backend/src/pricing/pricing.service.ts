import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus, ProductType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClubbingService } from '../clubbing/clubbing.service';

export interface PricingItemInput {
  productId: string;
  variationId?: string | null;
  quantity: number;
}

export interface PricingIssue {
  reason: 'out_of_stock' | 'insufficient_stock' | 'inactive';
  availableQuantity: number;
}

export interface ComputedPricingItem {
  productId: string;
  variationId: string | null;
  titleSnapshot: string;
  skuSnapshot: string;
  image: string | null;
  unitPrice: number;
  regularPrice?: number;
  quantity: number;
  lineTotal: number;
  attributesSnapshot: any;
  stockAvailable: number | null;
  issues: PricingIssue[];
  product?: any;
  variant?: any;
}

export interface PricingCalculationResult {
  items: ComputedPricingItem[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  appliedCouponCode?: string | null;
  appliedRuleId?: string | null;
}

export interface PricingCalculationOptions {
  throwOnError?: boolean;
  couponCode?: string | null;
}

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clubbingService: ClubbingService,
  ) {}

  async calculatePricing(
    items: PricingItemInput[],
    options: PricingCalculationOptions = {},
  ): Promise<PricingCalculationResult> {
    const throwOnError = options.throwOnError ?? false;

    if (!items || items.length === 0) {
      if (throwOnError) {
        throw new BadRequestException('Order must contain at least one item');
      }
      return {
        items: [],
        subtotal: 0,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        grandTotal: 0,
      };
    }

    const productIds = Array.from(new Set(items.map((it) => it.productId)));
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    if (throwOnError && products.length !== productIds.length) {
      throw new NotFoundException('One or more products were not found');
    }

    let subtotal = 0;
    const discountInputItems: { productId: string; quantity: number; price: number }[] = [];
    const computedItems: ComputedPricingItem[] = [];

    for (const item of items) {
      const issues: PricingIssue[] = [];
      const product = productMap.get(item.productId);

      if (!product) {
        if (throwOnError) {
          throw new NotFoundException('One or more products were not found');
        }
        computedItems.push({
          productId: item.productId,
          variationId: item.variationId || null,
          titleSnapshot: 'Unavailable product',
          skuSnapshot: '',
          image: null,
          unitPrice: 0,
          quantity: item.quantity,
          lineTotal: 0,
          attributesSnapshot: null,
          stockAvailable: 0,
          issues: [{ reason: 'inactive', availableQuantity: 0 }],
        });
        continue;
      }

      if (product.status !== ProductStatus.active) {
        if (throwOnError) {
          throw new BadRequestException(`Product "${product.title}" is not active`);
        }
        issues.push({ reason: 'inactive', availableQuantity: 0 });
      }

      const isVariable = product.productType === ProductType.variable;
      let unitPrice = 0;
      let regularPrice = 0;
      let matchedVariant: any = null;
      let skuSnapshot = product.sku || '';
      let titleSnapshot = product.title;
      let variantId: string | null = null;
      let attributesSnapshot: any = null;
      let stockAvailable: number | null = null;
      let image: string | null = null;

      if (Array.isArray(product.images) && product.images.length > 0) {
        const firstImg = product.images[0] as any;
        image = typeof firstImg === 'string' ? firstImg : (firstImg?.url || firstImg?.src || null);
      }

      if (isVariable) {
        if (!item.variationId) {
          if (throwOnError) {
            throw new BadRequestException(
              `Variation ID is required for variable product "${product.title}"`,
            );
          }
          issues.push({ reason: 'inactive', availableQuantity: 0 });
        } else {
          const variations = Array.isArray(product.variations)
            ? (product.variations as any[])
            : [];
          const variant = variations.find((v: any) => String(v.id) === String(item.variationId));

          if (!variant || variant.isActive === false) {
            if (throwOnError) {
              throw new BadRequestException(
                `Active variation "${item.variationId}" not found for product "${product.title}"`,
              );
            }
            issues.push({ reason: 'inactive', availableQuantity: 0 });
          } else {
            matchedVariant = variant;
            const regPrice = Number(variant.regularPrice);
            const salePrice =
              variant.salePrice !== undefined && variant.salePrice !== null
                ? Number(variant.salePrice)
                : null;
            unitPrice = salePrice !== null && salePrice < regPrice ? salePrice : regPrice;
            regularPrice = regPrice;

            skuSnapshot = String(variant.sku || product.sku);
            variantId = String(variant.id);
            attributesSnapshot = variant.attributes || [];

            const attrLabels = (variant.attributes || [])
              .map((a: any) => a.option || a.value)
              .filter(Boolean)
              .join(', ');
            titleSnapshot = attrLabels ? `${product.title} - ${attrLabels}` : product.title;

            if (variant.image) {
              const varImg = variant.image as any;
              image = typeof varImg === 'string' ? varImg : (varImg?.src || varImg?.url || image);
            }

            if (variant.stockQuantity !== null && variant.stockQuantity !== undefined) {
              stockAvailable = Number(variant.stockQuantity);
              if (stockAvailable <= 0) {
                if (throwOnError) {
                  throw new BadRequestException(
                    `Insufficient stock for variation "${variant.sku || variant.id}"`,
                  );
                }
                issues.push({ reason: 'out_of_stock', availableQuantity: 0 });
              } else if (item.quantity > stockAvailable) {
                if (throwOnError) {
                  throw new BadRequestException(
                    `Insufficient stock for variation "${variant.sku || variant.id}"`,
                  );
                }
                issues.push({ reason: 'insufficient_stock', availableQuantity: stockAvailable });
              }
            }
          }
        }
      } else {
        // Simple product
        if (item.variationId) {
          if (throwOnError) {
            throw new BadRequestException(
              `Variation ID cannot be specified for simple product "${product.title}"`,
            );
          }
          issues.push({ reason: 'inactive', availableQuantity: 0 });
        }

        unitPrice = Number(product.salePrice ?? product.basePrice);
        regularPrice = Number(product.basePrice ?? unitPrice);

        if (product.stockQuantity !== null && product.stockQuantity !== undefined) {
          stockAvailable = Number(product.stockQuantity);
          if (stockAvailable <= 0) {
            if (throwOnError) {
              throw new BadRequestException(
                `Insufficient stock for product "${product.title}"`,
              );
            }
            issues.push({ reason: 'out_of_stock', availableQuantity: 0 });
          } else if (item.quantity > stockAvailable) {
            if (throwOnError) {
              throw new BadRequestException(
                `Insufficient stock for product "${product.title}"`,
              );
            }
            issues.push({ reason: 'insufficient_stock', availableQuantity: stockAvailable });
          }
        }
      }

      const lineTotal = unitPrice * item.quantity;
      if (issues.length === 0) {
        subtotal += lineTotal;
        discountInputItems.push({
          productId: product.id,
          quantity: item.quantity,
          price: unitPrice,
        });
      }

      computedItems.push({
        productId: product.id,
        variationId: variantId,
        titleSnapshot,
        skuSnapshot,
        image,
        unitPrice,
        regularPrice,
        quantity: item.quantity,
        lineTotal,
        attributesSnapshot,
        stockAvailable,
        issues,
        product,
        variant: matchedVariant,
      });
    }

    let discountTotal = 0;
    let appliedCouponCode: string | null = null;
    let appliedRuleId: string | null = null;

    try {
      const discountRes = await this.clubbingService.calculateCartDiscount(
        discountInputItems,
        options.couponCode || undefined,
      );
      discountTotal = Number(discountRes?.discountTotal || 0);
      appliedCouponCode = discountRes?.appliedCouponCode || null;
      appliedRuleId = discountRes?.appliedRuleId || null;
    } catch (err) {
      if (throwOnError) {
        throw err;
      }
      discountTotal = 0;
    }

    const shippingTotal = subtotal >= 499 || subtotal === 0 ? 0 : 49;
    const taxTotal = 0;
    const grandTotal = Math.max(0, subtotal - discountTotal + shippingTotal);

    return {
      items: computedItems,
      subtotal,
      discountTotal,
      shippingTotal,
      taxTotal,
      grandTotal,
      appliedCouponCode,
      appliedRuleId,
    };
  }
}
