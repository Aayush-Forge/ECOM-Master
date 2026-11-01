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

export interface CartDiscountCalculationResult {
  discountTotal: number;
  bundleDiscount: number;
  couponDiscount: number;
  appliedRuleId: string | null;
  appliedCouponCode: string | null;
  couponError?: string | null;
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
          code: null,
          requiredQuantity: 1,
          bannerImageDesktop: '/HD1.png',
          bannerImageMobile: '/HM1.png',
          featuredOnHomepage: true,
          showInHero: true,
          heroCtaText: 'Shop Festive Deals',
          isActive: true,
          products: {
            create: products.map((p, idx) => ({
              productId: p.id,
              clubbingPrice: Number(p.basePrice) > 40 ? Math.round(Number(p.basePrice) * 0.8) : Number(p.basePrice),
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

  private formatRule(r: any, publicOnly = false) {
    const products = Array.isArray(r.products)
      ? r.products.map((p: any) => {
          let imageUrl = '';
          const rawImages = p.product?.images;
          if (Array.isArray(rawImages) && rawImages.length > 0) {
            const first = rawImages[0];
            imageUrl = typeof first === 'string' ? first : (first?.src || first?.url || '');
          } else if (typeof p.image === 'string' && p.image) {
            imageUrl = p.image;
          }
          if (!imageUrl && p.product?.sku) {
            imageUrl = `https://pub-78b25314ac78421fb5abe572bdbf3407.r2.dev/products/${p.product.sku}.png`;
          }

          const originalPrice = p.product?.basePrice
            ? Number(p.product.basePrice)
            : p.originalPrice
              ? Number(p.originalPrice)
              : 299;
          const clubbingPrice = p.clubbingPrice
            ? Number(p.clubbingPrice)
            : p.product?.salePrice
              ? Number(p.product.salePrice)
              : originalPrice > 40
                ? Math.round(originalPrice * 0.8)
                : originalPrice;
          const discountPercentage = p.discountPercentage
            ? Number(p.discountPercentage)
            : originalPrice > clubbingPrice
              ? Math.round(((originalPrice - clubbingPrice) / originalPrice) * 100)
              : 20;

          const categoryName = p.product?.category?.name || p.category || 'Incense Sticks';

          return {
            productId: p.productId,
            name: p.product?.title || 'Sacred Item',
            title: p.product?.title || 'Sacred Item',
            slug: p.product?.slug || p.productId,
            image: imageUrl,
            images: imageUrl ? [{ src: imageUrl }] : [],
            category: categoryName,
            originalPrice,
            clubbingPrice,
            discountPercentage,
            sortOrder: p.sortOrder ?? 0,
          };
        })
      : [];

    const base: Record<string, any> = {
      id: r.id,
      name: r.name,
      eventName: r.eventName || r.name,
      tagline: r.tagline || '',
      description: r.description || '',
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

    if (!publicOnly) {
      base.code = r.code || '';
      base.usageLimit = r.usageLimit;
      base.usageCount = r.usageCount;
    }

    return base;
  }

  async getAllRules() {
    const rules = await this.prisma.clubbingRule.findMany({
      include: {
        products: {
          include: { product: { include: { category: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        applicableCategory: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return rules.map((r) => this.formatRule(r, false));
  }

  async getActiveRules(publicOnly = false) {
    const now = new Date();
    const whereClause: any = {
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
    };

    if (publicOnly) {
      whereClause.code = null;
    }

    const rules = await this.prisma.clubbingRule.findMany({
      where: whereClause,
      include: {
        products: {
          include: { product: { include: { category: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        applicableCategory: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return rules.map((r) => this.formatRule(r, publicOnly));
  }

  async getRuleById(id: string) {
    const isUuid = id.length === 36 && id.includes('-');
    let rule: any = null;
    if (this.prisma.clubbingRule.findFirst) {
      rule = await this.prisma.clubbingRule.findFirst({
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
            include: { product: { include: { category: true } } },
            orderBy: { sortOrder: 'asc' },
          },
          applicableCategory: true,
        },
      });
    } else if (this.prisma.clubbingRule.findUnique) {
      rule = await this.prisma.clubbingRule.findUnique({
        where: { id },
        include: {
          products: {
            include: { product: { include: { category: true } } },
            orderBy: { sortOrder: 'asc' },
          },
          applicableCategory: true,
        },
      });
    }

    if (!rule) {
      throw new NotFoundException(`Clubbing campaign "${id}" not found`);
    }
    return this.formatRule(rule, false);
  }

  async createRule(dto: any) {
    const name = String(dto.name || '').trim();
    if (!name) {
      throw new BadRequestException('Clubbing campaign name is required');
    }

    const eventName = String(dto.eventName || dto.name || '').trim();
    const rawCode = dto.code !== undefined && dto.code !== null && String(dto.code).trim() !== ''
      ? String(dto.code).trim().toUpperCase()
      : null;

    let code: string | null = rawCode;
    if (code) {
      const existingCode = await this.prisma.clubbingRule.findUnique({ where: { code } });
      if (existingCode) {
        throw new BadRequestException(`Coupon code "${code}" is already in use.`);
      }
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
        fixedPrice: dto.fixedPrice !== undefined && dto.fixedPrice !== null && dto.fixedPrice !== '' ? Number(dto.fixedPrice) : null,
        percentageOff: dto.percentageOff !== undefined && dto.percentageOff !== null && dto.percentageOff !== '' ? Number(dto.percentageOff) : null,
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
        usageLimit: dto.usageLimit !== undefined && dto.usageLimit !== null && dto.usageLimit !== '' ? Number(dto.usageLimit) : null,
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
    if (dto.code !== undefined) {
      if (dto.code === null || String(dto.code).trim() === '') {
        updateData.code = null;
      } else {
        const cleanCode = String(dto.code).trim().toUpperCase();
        const existingCodeMatch = await this.prisma.clubbingRule.findFirst({
          where: { code: cleanCode, NOT: { id: existing.id } },
        });
        if (existingCodeMatch) {
          throw new BadRequestException(`Coupon code "${cleanCode}" is already in use.`);
        }
        updateData.code = cleanCode;
      }
    }
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.requiredQuantity !== undefined) updateData.requiredQuantity = Number(dto.requiredQuantity);
    if (dto.fixedPrice !== undefined) updateData.fixedPrice = dto.fixedPrice !== null && dto.fixedPrice !== '' ? Number(dto.fixedPrice) : null;
    if (dto.percentageOff !== undefined) updateData.percentageOff = dto.percentageOff !== null && dto.percentageOff !== '' ? Number(dto.percentageOff) : null;
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
    if (dto.usageLimit !== undefined) {
      updateData.usageLimit = dto.usageLimit !== null && dto.usageLimit !== '' ? Number(dto.usageLimit) : null;
    }
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
    let existing: any = null;
    if (this.prisma.clubbingRule.findUnique) {
      existing = await this.prisma.clubbingRule.findUnique({ where: { id } }).catch(() => null);
    }
    if (!existing && this.prisma.clubbingRule.findFirst) {
      existing = await this.prisma.clubbingRule.findFirst({
        where: {
          OR: [
            { id },
            { code: id },
            { name: { equals: id, mode: 'insensitive' as any } },
          ],
        },
      }).catch(() => null);
    }

    if (!existing) {
      throw new NotFoundException(`Clubbing campaign "${id}" not found`);
    }

    if (this.prisma.clubbingRuleProduct?.deleteMany) {
      await this.prisma.clubbingRuleProduct.deleteMany({ where: { ruleId: existing.id } }).catch(() => {});
    }
    await this.prisma.clubbingRule.delete({ where: { id: existing.id } });
    return { id: existing.id };
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

  async calculateCartDiscount(
    cartItems: CartItemDiscountInput[],
    couponCode?: string,
  ): Promise<CartDiscountCalculationResult> {
    let discountTotal = 0;
    let bundleDiscount = 0;
    let couponDiscount = 0;
    let appliedRuleId: string | null = null;
    let appliedCouponCode: string | null = null;
    let couponError: string | null = null;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return {
        discountTotal: 0,
        bundleDiscount: 0,
        couponDiscount: 0,
        appliedRuleId: null,
        appliedCouponCode: null,
        couponError: null,
      };
    }

    // 1. Fetch categories for cart products
    const productIds = Array.from(new Set(cartItems.map((it) => it.productId).filter(Boolean)));
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, categoryId: true },
    });
    const categoryMap = new Map<string, string>(products.map((p) => [p.id, p.categoryId]));

    // 2. Fetch all active rules
    const activeRules = await this.getActiveRules(false);

    // 3. Separate automatic bundle rules vs coupon rule
    const normalizedCouponCode =
      couponCode && typeof couponCode === 'string' && couponCode.trim() !== ''
        ? couponCode.trim().toLowerCase()
        : null;

    let matchedCouponRule: any = null;

    if (normalizedCouponCode) {
      matchedCouponRule = activeRules.find((r) => {
        const codeMatch = r.code && String(r.code).toLowerCase() === normalizedCouponCode;
        const nameMatch = r.name && String(r.name).toLowerCase() === normalizedCouponCode;
        return codeMatch || nameMatch;
      });

      if (!matchedCouponRule) {
        const ruleInDb = await this.prisma.clubbingRule.findFirst({
          where: {
            OR: [
              { code: { equals: normalizedCouponCode, mode: 'insensitive' as any } },
              { name: { equals: normalizedCouponCode, mode: 'insensitive' as any } },
            ],
          },
        });

        if (!ruleInDb) {
          couponError = 'Invalid coupon code';
        } else if (!ruleInDb.isActive) {
          couponError = 'This coupon is no longer active';
        } else if (ruleInDb.startsAt && new Date(ruleInDb.startsAt) > new Date()) {
          couponError = 'This coupon is not active yet';
        } else if (ruleInDb.endsAt && new Date(ruleInDb.endsAt) < new Date()) {
          couponError = 'This coupon has expired';
        } else if (ruleInDb.usageLimit !== null && ruleInDb.usageCount >= ruleInDb.usageLimit) {
          couponError = 'Coupon usage limit has been reached';
        } else {
          couponError = 'Coupon is not applicable to current cart';
        }
      } else {
        if (
          matchedCouponRule.usageLimit !== null &&
          matchedCouponRule.usageLimit !== undefined &&
          matchedCouponRule.usageCount >= matchedCouponRule.usageLimit
        ) {
          couponError = 'Coupon usage limit has been reached';
          matchedCouponRule = null;
        }
      }
    }

    // Working items representation to calculate bundle discounts first and then stack coupon discounts
    const workingItems = cartItems.map((it) => ({
      productId: it.productId,
      quantity: Number(it.quantity) || 1,
      originalUnitPrice: Number(it.price) || 0,
      currentUnitPrice: Number(it.price) || 0,
      bundleSavings: 0,
    }));

    const consumedProductIds = new Set<string>();

    // 4. STEP 1: Apply Automatic Rules (Rules without an explicit promo coupon code, or custom_product_clubbing)
    for (const rule of activeRules) {
      if (rule === matchedCouponRule) continue;
      // If a rule has a code and is not custom_product_clubbing, it requires that code
      if (rule.code && rule.type !== ClubbingRuleType.custom_product_clubbing) {
        continue;
      }

      const productsList = rule.products || rule.clubbingProducts || [];
      const hasSpecificProducts = Array.isArray(productsList) && productsList.length > 0;
      const eligibleProductIds = new Set(
        productsList.map((p: any) => p.productId || p.id).filter(Boolean),
      );

      const qualifyingItems = workingItems.filter((it) => {
        if (consumedProductIds.has(it.productId)) return false;
        if (hasSpecificProducts) {
          return eligibleProductIds.has(it.productId);
        }
        if (rule.applicableCategoryId && rule.applicableCategoryId !== 'all') {
          return categoryMap.get(it.productId) === rule.applicableCategoryId;
        }
        return true;
      });

      if (qualifyingItems.length === 0) continue;

      const totalQualifyingQty = qualifyingItems.reduce((acc, it) => acc + it.quantity, 0);
      const reqQty = Number(rule.requiredQuantity) || 1;
      const ruleType = String(rule.type || '').toLowerCase();

      if (ruleType === 'fixed_price_bundle' || ruleType === 'fixed_price') {
        if (totalQualifyingQty >= reqQty && rule.fixedPrice !== null && rule.fixedPrice !== undefined) {
          const bundles = Math.floor(totalQualifyingQty / reqQty);
          const bundledQty = bundles * reqQty;
          const totalVal = qualifyingItems.reduce((sum, it) => sum + it.currentUnitPrice * it.quantity, 0);
          const avgUnitPrice = totalVal / totalQualifyingQty;
          const originalBundledAmount = avgUnitPrice * bundledQty;
          const discountedBundledAmount = Number(rule.fixedPrice) * bundles;
          const saving = Math.max(0, originalBundledAmount - discountedBundledAmount);

          if (saving > 0) {
            bundleDiscount += saving;
            appliedRuleId = rule.id;
            const savingPerUnit = saving / bundledQty;
            qualifyingItems.forEach((it) => {
              consumedProductIds.add(it.productId);
              it.currentUnitPrice = Math.max(0, it.currentUnitPrice - savingPerUnit);
              it.bundleSavings += savingPerUnit * it.quantity;
            });
          }
        }
      } else if (ruleType === 'percentage_off_bundle' || ruleType === 'percentage_off') {
        if (totalQualifyingQty >= reqQty && rule.percentageOff !== null && rule.percentageOff !== undefined) {
          const bundles = Math.floor(totalQualifyingQty / reqQty);
          const bundledQty = bundles * reqQty;
          const totalVal = qualifyingItems.reduce((sum, it) => sum + it.currentUnitPrice * it.quantity, 0);
          const avgUnitPrice = totalVal / totalQualifyingQty;
          const originalBundledAmount = avgUnitPrice * bundledQty;
          const saving = originalBundledAmount * (Number(rule.percentageOff) / 100);

          if (saving > 0) {
            bundleDiscount += saving;
            appliedRuleId = rule.id;
            const savingPerUnit = saving / bundledQty;
            qualifyingItems.forEach((it) => {
              consumedProductIds.add(it.productId);
              it.currentUnitPrice = Math.max(0, it.currentUnitPrice - savingPerUnit);
              it.bundleSavings += savingPerUnit * it.quantity;
            });
          }
        }
      } else {
        // custom_product_clubbing
        let customSavings = 0;
        const eligibleMap = new Map<string, any>();
        for (const p of productsList) {
          eligibleMap.set(p.productId || p.id, p);
        }

        if (totalQualifyingQty >= reqQty) {
          for (const item of qualifyingItems) {
            const cp = eligibleMap.get(item.productId);
            if (cp && cp.clubbingPrice && Number(cp.clubbingPrice) < item.currentUnitPrice) {
              const diff = item.currentUnitPrice - Number(cp.clubbingPrice);
              const itemSave = diff * item.quantity;
              customSavings += itemSave;
              item.currentUnitPrice = Number(cp.clubbingPrice);
              item.bundleSavings += itemSave;
              consumedProductIds.add(item.productId);
            }
          }
        }

        if (customSavings > 0) {
          bundleDiscount += customSavings;
          appliedRuleId = rule.id;
        }
      }
    }

    // 5. STEP 2: Apply Matched Coupon Code Rule
    if (matchedCouponRule) {
      const productsList = matchedCouponRule.products || matchedCouponRule.clubbingProducts || [];
      const hasSpecificProducts = Array.isArray(productsList) && productsList.length > 0;
      const eligibleProductIds = new Set(
        productsList.map((p: any) => p.productId || p.id).filter(Boolean),
      );

      const qualifyingItems = workingItems.filter((it) => {
        if (hasSpecificProducts) {
          return eligibleProductIds.has(it.productId);
        }
        if (matchedCouponRule.applicableCategoryId && matchedCouponRule.applicableCategoryId !== 'all') {
          return categoryMap.get(it.productId) === matchedCouponRule.applicableCategoryId;
        }
        return true; // storewide coupon
      });

      const totalQualifyingQty = qualifyingItems.reduce((acc, it) => acc + it.quantity, 0);
      const reqQty = Number(matchedCouponRule.requiredQuantity) || 1;
      const ruleType = String(matchedCouponRule.type || '').toLowerCase();

      if (qualifyingItems.length === 0 || totalQualifyingQty < reqQty) {
        couponError = `Coupon requires at least ${reqQty} qualifying item(s) in your cart`;
      } else {
        let couponSavings = 0;

        if (ruleType === 'percentage_off_bundle' || ruleType === 'percentage_off') {
          if (matchedCouponRule.percentageOff !== null && matchedCouponRule.percentageOff !== undefined) {
            const pct = Number(matchedCouponRule.percentageOff);
            // Apply percentage discount on effective price of qualifying items (including bundled items)
            couponSavings = qualifyingItems.reduce(
              (sum, it) => sum + it.currentUnitPrice * it.quantity * (pct / 100),
              0,
            );
          }
        } else if (ruleType === 'fixed_price_bundle' || ruleType === 'fixed_price') {
          if (matchedCouponRule.fixedPrice !== null && matchedCouponRule.fixedPrice !== undefined) {
            const bundles = Math.floor(totalQualifyingQty / reqQty);
            const bundledQty = bundles * reqQty;
            const totalVal = qualifyingItems.reduce(
              (sum, it) => sum + it.currentUnitPrice * it.quantity,
              0,
            );
            const avgUnitPrice = totalVal / totalQualifyingQty;
            const originalBundledAmount = avgUnitPrice * bundledQty;
            const discountedBundledAmount = Number(matchedCouponRule.fixedPrice) * bundles;
            couponSavings = Math.max(0, originalBundledAmount - discountedBundledAmount);
          }
        } else {
          // custom_product_clubbing
          const eligibleMap = new Map<string, any>();
          for (const p of productsList) {
            eligibleMap.set(p.productId || p.id, p);
          }
          for (const item of qualifyingItems) {
            const cp = eligibleMap.get(item.productId);
            if (cp && cp.clubbingPrice && Number(cp.clubbingPrice) < item.currentUnitPrice) {
              couponSavings += (item.currentUnitPrice - Number(cp.clubbingPrice)) * item.quantity;
            }
          }
        }

        if (couponSavings > 0) {
          couponDiscount = couponSavings;
          appliedCouponCode = matchedCouponRule.code || matchedCouponRule.name;
          couponError = null;
        } else {
          couponError = 'Coupon does not provide an additional discount on current cart';
        }
      }
    }

    discountTotal = bundleDiscount + couponDiscount;

    return {
      discountTotal: Math.round(discountTotal * 100) / 100,
      bundleDiscount: Math.round(bundleDiscount * 100) / 100,
      couponDiscount: Math.round(couponDiscount * 100) / 100,
      appliedRuleId,
      appliedCouponCode,
      couponError,
    };
  }
}
