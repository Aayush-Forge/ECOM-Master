import { Injectable, NotFoundException } from '@nestjs/common';
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
  constructor(private readonly prisma: PrismaService) {}

  async createRule(dto: CreateClubbingRuleDto) {
    const { applicableProductIds, ...ruleData } = dto;

    return this.prisma.clubbingRule.create({
      data: {
        ...ruleData,
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
  }

  async getAllRules() {
    return this.prisma.clubbingRule.findMany({
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
  }

  async getRuleById(id: string) {
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

    const { applicableProductIds, ...ruleData } = dto;

    return this.prisma.$transaction(async (tx) => {
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
  }

  async getActiveRules() {
    const now = new Date();
    return this.prisma.clubbingRule.findMany({
      where: {
        isActive: true,
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
  }

  async deleteRule(id: string) {
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

  async calculateCartDiscount(cartItems: CartItemDiscountInput[]) {
    const activeRules = await this.getActiveRules();
    let totalDiscount = 0;

    for (const rule of activeRules) {
      const ruleProductIds = new Set(rule.products.map((p) => p.productId));

      const applicableItems = cartItems.filter((item) =>
        ruleProductIds.size === 0 || ruleProductIds.has(item.productId),
      );

      const totalQuantity = applicableItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      if (totalQuantity >= rule.requiredQuantity) {
        const originalPrice = applicableItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );

        if (rule.type === 'fixed_price_bundle' && rule.fixedPrice) {
          totalDiscount += originalPrice - Number(rule.fixedPrice);
        } else if (rule.type === 'percentage_off_bundle' && rule.percentageOff) {
          totalDiscount += originalPrice * (Number(rule.percentageOff) / 100);
        }
      }
    }

    return { discountTotal: Math.max(0, totalDiscount) };
  }
}
