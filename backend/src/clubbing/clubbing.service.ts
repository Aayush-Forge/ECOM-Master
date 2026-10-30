import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClubbingRuleDto, ClubbingRuleType } from './dto/create-clubbing-rule.dto';

export interface ClubbingRuleModel {
  id: string;
  name: string;
  type: ClubbingRuleType | string;
  requiredQuantity: number;
  fixedPrice: number | null;
  percentageOff: number | null;
  applicableCategoryId?: string | null;
  applicableProductIds: string[];
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
  featuredOnHomepage?: boolean;
  tagline?: string;
  bannerImage?: string;
  description?: string;
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
    try {
      const createData: any = {
        name: dto.name,
        type: dto.type,
        requiredQuantity: Number(dto.requiredQuantity),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        applicableProductIds: Array.isArray(dto.applicableProductIds)
          ? dto.applicableProductIds.filter((id) => typeof id === 'string' && id.length === 36)
          : [],
      };
      if (dto.fixedPrice !== undefined && dto.fixedPrice !== null) {
        createData.fixedPrice = Number(dto.fixedPrice);
      }
      if (dto.percentageOff !== undefined && dto.percentageOff !== null) {
        createData.percentageOff = Number(dto.percentageOff);
      }
      if (dto.applicableCategoryId && dto.applicableCategoryId.length === 36) {
        createData.applicableCategoryId = dto.applicableCategoryId;
      }
      if (dto.startsAt) {
        createData.startsAt = new Date(dto.startsAt);
      }
      if (dto.endsAt) {
        createData.endsAt = new Date(dto.endsAt);
      }

      const created = await this.prisma.clubbingRule.create({
        data: createData,
      });
      return created;
    } catch (err: any) {
      console.warn('Prisma createRule error, saving to memory fallback:', err.message);
      const newRule: ClubbingRuleModel = {
        id: `clb_${Date.now()}`,
        name: dto.name,
        type: dto.type,
        requiredQuantity: dto.requiredQuantity,
        fixedPrice: dto.fixedPrice !== undefined && dto.fixedPrice !== null ? Number(dto.fixedPrice) : null,
        percentageOff: dto.percentageOff !== undefined && dto.percentageOff !== null ? Number(dto.percentageOff) : null,
        applicableCategoryId: dto.applicableCategoryId || null,
        applicableProductIds: dto.applicableProductIds || [],
        startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      };
      this.fallbackRules.unshift(newRule);
      return newRule;
    }
  }

  async getAllRules() {
    try {
      const dbRules = await this.prisma.clubbingRule.findMany({
        include: { applicableCategory: true },
      });
      if (dbRules.length > 0) {
        return dbRules;
      }
      return this.fallbackRules;
    } catch {
      return this.fallbackRules;
    }
  }

  async getActiveRules() {
    try {
      const dbRules = await this.prisma.clubbingRule.findMany({
        where: { isActive: true },
        include: { applicableCategory: true },
      });
      if (dbRules.length > 0) {
        return dbRules;
      }
      return this.fallbackRules.filter((r) => r.isActive);
    } catch {
      return this.fallbackRules.filter((r) => r.isActive);
    }
  }

  async deleteRule(id: string) {
    try {
      const rule = await this.prisma.clubbingRule.findUnique({ where: { id } });
      if (!rule) throw new NotFoundException('Clubbing rule not found');
      return await this.prisma.clubbingRule.delete({ where: { id } });
    } catch {
      const idx = this.fallbackRules.findIndex((r) => r.id === id);
      if (idx === -1) throw new NotFoundException('Clubbing rule not found');
      const deleted = this.fallbackRules.splice(idx, 1)[0];
      return deleted;
    }
  }

  async calculateCartDiscount(cartItems: { productId: string; quantity: number; price: number }[]) {
    const activeRules = await this.getActiveRules();
    let totalDiscount = 0;

    for (const rule of activeRules) {
      const applicableItems = (rule.applicableProductIds && rule.applicableProductIds.length > 0)
        ? cartItems.filter((item) => rule.applicableProductIds.includes(item.productId))
        : cartItems;

      const totalQuantity = applicableItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

      if (totalQuantity >= rule.requiredQuantity) {
        const originalPrice = applicableItems.reduce(
          (sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1),
          0,
        );

        let discount = 0;
        if (rule.type === 'fixed_price_bundle' && rule.fixedPrice) {
          const bundlePrice = Number(rule.fixedPrice);
          if (originalPrice > bundlePrice) {
            discount = originalPrice - bundlePrice;
          }
        } else if (rule.type === 'percentage_off_bundle' && rule.percentageOff) {
          discount = (originalPrice * Number(rule.percentageOff)) / 100;
        }

        if (discount > totalDiscount) {
          totalDiscount = discount;
        }
      }
    }

    return { discountTotal: Math.round(Math.max(0, totalDiscount)) };
  }
}