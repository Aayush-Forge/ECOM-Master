import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClubbingRuleDto } from './dto/create-clubbing-rule.dto';
import { UpdateClubbingRuleDto } from './dto/update-clubbing-rule.dto';

export interface CartItemDiscountInput {
  productId: string;
  quantity: number;
  price: number;
}

@Injectable()
export class ClubbingService {
  private fallbackRules: any[] = [
    {
      id: 'diwali',
      name: 'Diwali',
      eventName: 'Diwali',
      tagline: 'Diwali Sale',
      description: 'Exclusive Diwali festive clubbing collection. Hand-selected premium incense and sacred dhoop at special celebratory prices.',
      type: 'custom_product_clubbing',
      requiredQuantity: 1,
      fixedPrice: null,
      percentageOff: null,
      applicableProductIds: ['sd-001', 'sd-002', 'sd-003', 'sd-004', 'sd-005', 'sd-006'],
      bannerImageDesktop: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80',
      bannerImageMobile: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80',
      clubbingProducts: [
        {
          productId: 'sd-001',
          name: 'Royal Mysore Sandalwood',
          slug: 'royal-mysore-sandalwood',
          image: 'https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=600&q=80',
          category: 'Mysore Sandalwood',
          originalPrice: 399,
          clubbingPrice: 299,
          discountPercentage: 25,
        },
        {
          productId: 'sd-002',
          name: 'Divine Rose',
          slug: 'divine-rose-incense',
          image: 'https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg?auto=format&fit=crop&w=600&q=80',
          category: 'Floral Notes',
          originalPrice: 349,
          clubbingPrice: 249,
          discountPercentage: 29,
        },
        {
          productId: 'sd-003',
          name: 'Sacred Frankincense',
          slug: 'sacred-frankincense-incense',
          image: 'https://images.unsplash.com/photo-1777732339789-5dc3483ed951?auto=format&fit=crop&w=600&q=80',
          category: 'Sacred Resins',
          originalPrice: 449,
          clubbingPrice: 329,
          discountPercentage: 27,
        },
        {
          productId: 'sd-004',
          name: 'The Maharaja Luxury Sticks',
          slug: 'maharaja-luxury-sticks',
          image: 'https://images.unsplash.com/photo-1760835249761-dc1ad2d7d759?auto=format&fit=crop&w=600&q=80',
          category: 'Mysore Sandalwood',
          originalPrice: 549,
          clubbingPrice: 399,
          discountPercentage: 27,
        },
        {
          productId: 'sd-005',
          name: 'The Monk Meditation Cones',
          slug: 'monk-meditation-cones',
          image: 'https://images.unsplash.com/photo-1771929712193-fce37df50681?auto=format&fit=crop&w=600&q=80',
          category: 'Mysore Sandalwood',
          originalPrice: 499,
          clubbingPrice: 389,
          discountPercentage: 22,
        },
        {
          productId: 'sd-006',
          name: 'Vedic Havan Sambrani Cups',
          slug: 'vedic-havan-sambrani-cups',
          image: 'https://images.unsplash.com/photo-1777732340986-bc27a8b5d522?auto=format&fit=crop&w=600&q=80',
          category: 'Sacred Resins',
          originalPrice: 399,
          clubbingPrice: 299,
          discountPercentage: 25,
        },
      ],
      isActive: true,
      featuredOnHomepage: true,
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async createRule(dto: CreateClubbingRuleDto) {
    const { applicableProductIds, code, ...ruleData } = dto;
    const normalizedCode = code && code.trim() ? code.trim().toUpperCase() : null;

    try {
      return await this.prisma.clubbingRule.create({
        data: {
          ...ruleData,
          code: normalizedCode,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          products: applicableProductIds?.length
            ? {
                create: applicableProductIds.map((productId) => ({
                  product: { connect: { id: productId } },
                })),
              }
            : undefined,
        },
        include: {
          applicableCategory: true,
          products: {
            include: {
              product: true,
            },
          },
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(`Discount code "${normalizedCode}" is already in use`);
      }
      throw err;
    }
  }

  async getAllRules() {
    try {
      const dbRules = await this.prisma.clubbingRule.findMany({
        include: {
          applicableCategory: true,
          products: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  sku: true,
                  basePrice: true,
                  salePrice: true,
                  images: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (dbRules && dbRules.length > 0) {
        return dbRules;
      }
      return this.fallbackRules;
    } catch {
      return this.fallbackRules;
    }
  }

  async getRuleById(id: string) {
    const fallback = this.fallbackRules.find((r) => r.id === id);
    if (fallback) return fallback;

    const rule = await this.prisma.clubbingRule.findUnique({
      where: { id },
      include: {
        applicableCategory: true,
        products: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                sku: true,
                basePrice: true,
                salePrice: true,
                images: true,
              },
            },
          },
        },
      },
    });

    if (!rule) {
      throw new NotFoundException(`Clubbing rule with ID "${id}" not found`);
    }

    return rule;
  }

  async updateRule(id: string, dto: UpdateClubbingRuleDto) {
    const existing = await this.prisma.clubbingRule.findUnique({
      where: { id },
      include: { products: true },
    });

    if (!existing) {
      throw new NotFoundException(`Clubbing rule with ID "${id}" not found`);
    }

    const { applicableProductIds, code, ...ruleData } = dto;
    const normalizedCode =
      code !== undefined
        ? code && code.trim()
          ? code.trim().toUpperCase()
          : null
        : undefined;

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (applicableProductIds !== undefined) {
          await tx.clubbingRuleProduct.deleteMany({
            where: { ruleId: id },
          });

          if (applicableProductIds.length > 0) {
            await tx.clubbingRuleProduct.createMany({
              data: applicableProductIds.map((productId) => ({
                ruleId: id,
                productId,
              })),
            });
          }
        }

        return tx.clubbingRule.update({
          where: { id },
          data: {
            ...ruleData,
            ...(normalizedCode !== undefined ? { code: normalizedCode } : {}),
            startsAt:
              dto.startsAt !== undefined
                ? dto.startsAt
                  ? new Date(dto.startsAt)
                  : null
                : undefined,
            endsAt:
              dto.endsAt !== undefined
                ? dto.endsAt
                  ? new Date(dto.endsAt)
                  : null
                : undefined,
          },
          include: {
            applicableCategory: true,
            products: {
              include: {
                product: true,
              },
            },
          },
        });
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(`Discount code "${normalizedCode}" is already in use`);
      }
      throw err;
    }
  }

  private toPublicRule(rule: any) {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      type: rule.type,
      requiredQuantity: rule.requiredQuantity,
      fixedPrice: rule.fixedPrice,
      percentageOff: rule.percentageOff,
      applicableCategoryId: rule.applicableCategoryId,
      startsAt: rule.startsAt,
      endsAt: rule.endsAt,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      applicableCategory: rule.applicableCategory,
      products: rule.products,
      bannerImageDesktop: rule.bannerImageDesktop,
      bannerImageMobile: rule.bannerImageMobile,
      bannerImage: rule.bannerImage,
      clubbingProducts: rule.clubbingProducts,
    };
  }

  async getActiveRules(publicOnly = true) {
    try {
      const rules = await this.findActiveRulesInternal(publicOnly);
      if (rules && rules.length > 0) {
        if (publicOnly) {
          return rules.map((rule) => this.toPublicRule(rule));
        }
        return rules;
      }
    } catch {}

    const fallbackActive = this.fallbackRules.filter((r) => r.isActive);
    if (publicOnly) {
      return fallbackActive.map((rule) => this.toPublicRule(rule));
    }
    return fallbackActive;
  }

  private async findActiveRulesInternal(onlyWithoutCode = false) {
    const now = new Date();
    const rules = await this.prisma.clubbingRule.findMany({
      where: {
        isActive: true,
        ...(onlyWithoutCode ? { code: null } : {}),
        OR: [
          { startsAt: null, endsAt: null },
          { startsAt: { lte: now }, endsAt: null },
          { startsAt: null, endsAt: { gte: now } },
          { startsAt: { lte: now }, endsAt: { gte: now } },
        ],
      },
      include: {
        applicableCategory: true,
        products: {
          include: {
            product: true,
          },
        },
      },
    });

    return rules.filter(
      (rule) => rule.usageLimit == null || rule.usageCount < rule.usageLimit,
    );
  }

  async deleteRule(id: string) {
    const idx = this.fallbackRules.findIndex((r) => r.id === id);
    if (idx !== -1) {
      return this.fallbackRules.splice(idx, 1)[0];
    }

    const rule = await this.prisma.clubbingRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Clubbing rule not found');
    }

    await this.prisma.clubbingRuleProduct.deleteMany({
      where: { ruleId: id },
    });

    return this.prisma.clubbingRule.delete({ where: { id } });
  }

  async bulkDelete(ids: string[]) {
    if (!ids || ids.length === 0) return { count: 0 };

    await this.prisma.clubbingRuleProduct.deleteMany({
      where: { ruleId: { in: ids } },
    });

    return this.prisma.clubbingRule.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async bulkUpdateStatus(ids: string[], isActive: boolean) {
    if (!ids || ids.length === 0) return { count: 0 };

    return this.prisma.clubbingRule.updateMany({
      where: { id: { in: ids } },
      data: { isActive },
    });
  }

  async calculateCartDiscount(
    cartItems: CartItemDiscountInput[],
    couponCode?: string,
  ) {
    let activeRules: any[] = [];
    try {
      activeRules = await this.findActiveRulesInternal();
    } catch {
      activeRules = [];
    }

    const cleanCode = couponCode && couponCode.trim() ? couponCode.trim().toUpperCase() : null;

    if (cleanCode && (!activeRules || activeRules.length === 0)) {
      const found = await this.prisma.clubbingRule.findFirst({
        where: {
          code: { equals: cleanCode, mode: 'insensitive' },
        },
        include: {
          applicableCategory: true,
          products: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!found || !found.isActive) {
        throw new BadRequestException('Invalid coupon code');
      }

      const now = new Date();
      if (found.startsAt && found.startsAt > now) {
        throw new BadRequestException('Coupon is not yet active');
      }
      if (found.endsAt && found.endsAt < now) {
        throw new BadRequestException('Coupon has expired');
      }
      if (found.usageLimit != null && found.usageCount >= found.usageLimit) {
        throw new BadRequestException('Coupon usage limit reached');
      }

      activeRules = [found];
    }

    let totalDiscount = 0;
    let appliedCode: string | null = null;
    let appliedRuleId: string | null = null;

    for (const rule of activeRules) {
      if (rule.code) {
        if (!cleanCode || rule.code.toUpperCase() !== cleanCode) {
          continue;
        }
      }

      const ruleProductIds = new Set((rule.products || []).map((p: any) => p.productId));

      const applicableItems = cartItems.filter((item) =>
        ruleProductIds.size === 0 || ruleProductIds.has(item.productId),
      );

      const totalQuantity = applicableItems.reduce(
        (sum, item) => sum + (item.quantity || 1),
        0,
      );

      if (totalQuantity >= (rule.requiredQuantity || 1)) {
        const originalPrice = applicableItems.reduce(
          (sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1),
          0,
        );

        let ruleDiscount = 0;
        if (rule.type === 'fixed_price_bundle' && rule.fixedPrice) {
          ruleDiscount = Math.max(0, originalPrice - Number(rule.fixedPrice));
        } else if (rule.type === 'percentage_off_bundle' && rule.percentageOff) {
          ruleDiscount = Math.max(0, originalPrice * (Number(rule.percentageOff) / 100));
        }

        if (ruleDiscount > 0) {
          totalDiscount += ruleDiscount;
          if (rule.code) {
            appliedCode = rule.code;
            appliedRuleId = rule.id;
          }
        }
      }
    }

    return {
      discountTotal: Math.round(Math.max(0, totalDiscount)),
      appliedCouponCode: appliedCode,
      appliedRuleId,
    };
  }
}
