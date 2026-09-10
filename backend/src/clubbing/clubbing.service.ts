import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClubbingRuleDto } from './dto/create-clubbing-rule.dto';

@Injectable()
export class ClubbingService {
  constructor(private readonly prisma: PrismaService) {}

  async createRule(dto: CreateClubbingRuleDto) {
    return this.prisma.clubbingRule.create({
      data: dto,
    });
  }

  async getAllRules() {
    return this.prisma.clubbingRule.findMany({
      include: { applicableCategory: true },
    });
  }

  async getActiveRules() {
    return this.prisma.clubbingRule.findMany({
      where: { isActive: true },
      include: { applicableCategory: true },
    });
  }

  async deleteRule(id: string) {
    const rule = await this.prisma.clubbingRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Clubbing rule not found');

    return this.prisma.clubbingRule.delete({ where: { id } });
  }

  async calculateCartDiscount(cartItems: { productId: string, quantity: number, price: number }[]) {
    const activeRules = await this.getActiveRules();
    let totalDiscount = 0;

    for (const rule of activeRules) {
      // Find items in the cart that apply to this specific rule
      const applicableItems = cartItems.filter(item =>
        rule.applicableProductIds?.includes(item.productId)
      );

      const totalQuantity = applicableItems.reduce((sum, item) => sum + item.quantity, 0);

      // If the cart has enough items to trigger the bundle rule
      if (totalQuantity >= rule.requiredQuantity) {
        const originalPrice = applicableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        if (rule.type === 'fixed_price_bundle' && rule.fixedPrice) {
          totalDiscount += (originalPrice - Number(rule.fixedPrice));
        } else if (rule.type === 'percentage_off_bundle' && rule.percentageOff) {
          totalDiscount += (originalPrice * (Number(rule.percentageOff) / 100));
        }
      }
    }

    // Ensure we don't return negative discounts
    return { discountTotal: Math.max(0, totalDiscount) };
  }
}