import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClubbingRuleType } from '@prisma/client';

export interface CartItemDiscountInput {
  productId: string;
  quantity: number;
  price: number;
}

@Injectable()
export class ClubbingService implements OnModuleInit {
  private readonly logger = new Logger(ClubbingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultCampaignIfEmpty();
  }

  private async seedDefaultCampaignIfEmpty() {
    try {
      const count = await this.prisma.clubbingRule.count();
      if (count > 0) return;

      const products = await this.prisma.product.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
      });

      const rule = await this.prisma.clubbingRule.create({
        data: {
          name: 'Diwali Festive Clubbing',
          eventName: 'Diwali',
          tagline: 'Diwali Special Offer',
          description:
            'Exclusive Diwali festive clubbing collection. Hand-selected premium incense and sacred dhoop at special celebratory prices.',
          type: ClubbingRuleType.custom_product_clubbing,
          code: 'diwali',
          requiredQuantity: 1,
          bannerImageDesktop:
            'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80',
          bannerImageMobile:
            'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80',
          featuredOnHomepage: true,
          showInHero: true,
          heroCtaText: 'Shop Festive Deals',
          isActive: true,
          products: {
            create: products.map((p, idx) => ({
              productId: p.id,
              clubbingPrice: Number(p.basePrice) > 50 ? Number(p.basePrice) - 50 : Number(p.basePrice),
              discountPercentage: 20,
              sortOrder: idx,
            })),
          },
        },
      });
      this.logger.log(`Seeded default Diwali clubbing campaign: ${rule.id}`);
    } catch (err: any) {
      this.logger.warn(`Failed to seed default clubbing campaign: ${err.message}`);
    }
  }

  private formatRule(r: any) {
    const products = Array.isArray(r.products)
      ? r.products.map((p: any) => ({
          productId: p.productId,
          name: p.product?.title || 'Sacred Item',
          slug: p.product?.slug || p.productId,
          image:
            p.product?.images?.[0] ||
            'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=600&q=80',
          category: p.product?.categoryId || '',
          originalPrice: p.product?.basePrice ? Number(p.product.basePrice) : 299,
          clubbingPrice: p.clubbingPrice
            ? Number(p.clubbingPrice)
            : p.product?.basePrice
              ? Number(p.product.basePrice)
              : 249,
          discountPercentage: p.discountPercentage ? Number(p.discountPercentage) : 15,
        }))
      : [];

    return {
      id: r.id,
      name: r.name,
      eventName: r.eventName || r.name,
      tagline: r.tagline || '',
      description: r.description || '',
      code: r.code || r.id,
      type: r.type,
      requiredQuantity: r.requiredQuantity,
      fixedPrice: r.fixedPrice ? Number(r.fixedPrice) : null,
      percentageOff: r.percentageOff ? Number(r.percentageOff) : null,
      applicableCategoryId: r.applicableCategoryId,
      bannerImageDesktop: r.bannerImageDesktop || '',
      bannerImageMobile: r.bannerImageMobile || r.bannerImageDesktop || '',
      bannerImage: r.bannerImageDesktop || '',
      bannerKeyDesktop: r.bannerKeyDesktop || '',
      bannerKeyMobile: r.bannerKeyMobile || '',
      featuredOnHomepage: r.featuredOnHomepage !== false,
      showInHero: r.showInHero !== false,
      heroCtaText: r.heroCtaText || 'Shop Festive Deals',
      isActive: r.isActive !== false,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      products,
      clubbingProducts: products,
      applicableProductIds: products.map((p) => p.productId),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async getAllRules() {
    const rules = await this.prisma.clubbingRule.findMany({
      include: {
        products: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
        applicableCategory: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return rules.map((r) => this.formatRule(r));
  }

  async getActiveRules() {
    const now = new Date();
    const rules = await this.prisma.clubbingRule.findMany({
      where: {
        isActive: true,
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endsAt: null },
              { endsAt: { gte: now } },
            ],
          },
        ],
      },
      include: {
        products: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
        applicableCategory: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return rules.map((r) => this.formatRule(r));
  }

  async getRuleById(id: string) {
    const isUuid = id.length === 36 && id.includes('-');
    const rule = await this.prisma.clubbingRule.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id }] : []),
          { code: id },
          { eventName: { equals: id, mode: 'insensitive' as any } },
          { name: { equals: id, mode: 'insensitive' as any } },
        ],
      },
      include: {
        products: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
        applicableCategory: true,
      },
    });

    if (!rule) {
      throw new NotFoundException(`Clubbing campaign "${id}" not found`);
    }
    return this.formatRule(rule);
  }

  async createRule(dto: any) {
    const name = String(dto.name || '').trim();
    if (!name) {
      throw new BadRequestException('Clubbing campaign name is required');
    }

    const eventName = String(dto.eventName || dto.name || '').trim();
    let code = (dto.code || eventName.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[\s-]+/g, '-')) || `clb-${Date.now()}`;
    const existingCode = await this.prisma.clubbingRule.findUnique({ where: { code } });
    if (existingCode) {
      code = `${code}-${Date.now().toString().slice(-4)}`;
    }

    const desktopImg = dto.bannerImageDesktop || dto.bannerImage || null;
    const mobileImg = dto.bannerImageMobile || desktopImg;

    const clubbingProducts: any[] = Array.isArray(dto.clubbingProducts)
      ? dto.clubbingProducts
      : Array.isArray(dto.applicableProductIds)
        ? dto.applicableProductIds.map((pId: string, idx: number) => ({ productId: pId, sortOrder: idx }))
        : [];

    const rule = await this.prisma.clubbingRule.create({
      data: {
        name,
        eventName,
        tagline: dto.tagline ? String(dto.tagline).trim() : null,
        description: dto.description ? String(dto.description).trim() : null,
        type: dto.type || ClubbingRuleType.custom_product_clubbing,
        code,
        requiredQuantity: Number(dto.requiredQuantity) || 1,
        fixedPrice: dto.fixedPrice !== undefined && dto.fixedPrice !== null ? Number(dto.fixedPrice) : null,
        percentageOff: dto.percentageOff !== undefined && dto.percentageOff !== null ? Number(dto.percentageOff) : null,
        applicableCategoryId: dto.applicableCategoryId || null,
        bannerImageDesktop: desktopImg,
        bannerImageMobile: mobileImg,
        bannerKeyDesktop: dto.bannerKeyDesktop || null,
        bannerKeyMobile: dto.bannerKeyMobile || null,
        featuredOnHomepage: dto.featuredOnHomepage !== undefined ? Boolean(dto.featuredOnHomepage) : true,
        showInHero: dto.showInHero !== undefined ? Boolean(dto.showInHero) : true,
        heroCtaText: dto.heroCtaText || 'Shop Festive Deals',
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
        products: {
          create: clubbingProducts
            .filter((p) => p && (p.productId || p.id))
            .map((p, idx) => ({
              productId: p.productId || p.id,
              clubbingPrice: p.clubbingPrice ? Number(p.clubbingPrice) : null,
              discountPercentage: p.discountPercentage ? Number(p.discountPercentage) : null,
              sortOrder: p.sortOrder !== undefined ? Number(p.sortOrder) : idx,
            })),
        },
      },
      include: {
        products: { include: { product: true } },
      },
    });

    return this.formatRule(rule);
  }

  async updateRule(id: string, dto: any) {
    const existing = await this.getRuleById(id);

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = String(dto.name).trim();
    if (dto.eventName !== undefined) updateData.eventName = String(dto.eventName).trim();
    if (dto.tagline !== undefined) updateData.tagline = dto.tagline;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.requiredQuantity !== undefined) updateData.requiredQuantity = Number(dto.requiredQuantity);
    if (dto.fixedPrice !== undefined) updateData.fixedPrice = dto.fixedPrice !== null ? Number(dto.fixedPrice) : null;
    if (dto.percentageOff !== undefined) updateData.percentageOff = dto.percentageOff !== null ? Number(dto.percentageOff) : null;
    if (dto.applicableCategoryId !== undefined) updateData.applicableCategoryId = dto.applicableCategoryId || null;
    if (dto.bannerImageDesktop !== undefined) updateData.bannerImageDesktop = dto.bannerImageDesktop;
    if (dto.bannerImageMobile !== undefined) updateData.bannerImageMobile = dto.bannerImageMobile;
    if (dto.bannerKeyDesktop !== undefined) updateData.bannerKeyDesktop = dto.bannerKeyDesktop;
    if (dto.bannerKeyMobile !== undefined) updateData.bannerKeyMobile = dto.bannerKeyMobile;
    if (dto.featuredOnHomepage !== undefined) updateData.featuredOnHomepage = Boolean(dto.featuredOnHomepage);
    if (dto.showInHero !== undefined) updateData.showInHero = Boolean(dto.showInHero);
    if (dto.heroCtaText !== undefined) updateData.heroCtaText = dto.heroCtaText;
    if (dto.startsAt !== undefined) updateData.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) updateData.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (dto.isActive !== undefined) updateData.isActive = Boolean(dto.isActive);

    const clubbingProducts = dto.clubbingProducts || (Array.isArray(dto.applicableProductIds) ? dto.applicableProductIds.map((pId: string, idx: number) => ({ productId: pId, sortOrder: idx })) : null);

    if (clubbingProducts) {
      await this.prisma.clubbingRuleProduct.deleteMany({ where: { ruleId: existing.id } });
      updateData.products = {
        create: clubbingProducts
          .filter((p: any) => p && (p.productId || p.id))
          .map((p: any, idx: number) => ({
            productId: p.productId || p.id,
            clubbingPrice: p.clubbingPrice ? Number(p.clubbingPrice) : null,
            discountPercentage: p.discountPercentage ? Number(p.discountPercentage) : null,
            sortOrder: p.sortOrder !== undefined ? Number(p.sortOrder) : idx,
          })),
      };
    }

    const updated = await this.prisma.clubbingRule.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        products: { include: { product: true } },
      },
    });

    return this.formatRule(updated);
  }

  async toggleRule(id: string) {
    const existing = await this.getRuleById(id);
    const updated = await this.prisma.clubbingRule.update({
      where: { id: existing.id },
      data: { isActive: !existing.isActive },
      include: { products: { include: { product: true } } },
    });
    return this.formatRule(updated);
  }

  async deleteRule(id: string) {
    const existing = await this.getRuleById(id);
    await this.prisma.clubbingRule.delete({ where: { id: existing.id } });
    return { success: true, id: existing.id };
  }

  async bulkDelete(ids: string[]) {
    await this.prisma.clubbingRule.deleteMany({ where: { id: { in: ids } } });
    return { success: true, count: ids.length };
  }

  async bulkUpdateStatus(ids: string[], isActive: boolean) {
    await this.prisma.clubbingRule.updateMany({
      where: { id: { in: ids } },
      data: { isActive },
    });
    return { success: true, count: ids.length, isActive };
  }

  async calculateCartDiscount(cartItems: CartItemDiscountInput[], couponCode?: string) {
    let discountTotal = 0;
    let appliedRuleId: string | null = null;
    let appliedCouponCode: string | null = null;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return { discountTotal: 0, appliedRuleId: null, appliedCouponCode: null };
    }

    const activeRules = await this.getActiveRules();
    for (const rule of activeRules) {
      const eligibleMap = new Map<string, any>();
      for (const p of rule.clubbingProducts) {
        eligibleMap.set(p.productId, p);
      }

      for (const item of cartItems) {
        const eligible = eligibleMap.get(item.productId);
        if (eligible && eligible.clubbingPrice && eligible.clubbingPrice < item.price) {
          const discountPerUnit = item.price - eligible.clubbingPrice;
          discountTotal += discountPerUnit * item.quantity;
          appliedRuleId = rule.id;
        }
      }

      if (discountTotal > 0) break;
    }

    return {
      discountTotal: Math.round(discountTotal * 100) / 100,
      appliedRuleId,
      appliedCouponCode,
    };
  }
}
