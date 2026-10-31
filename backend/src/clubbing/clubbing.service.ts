import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
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

  private readonly dataFilePath = path.resolve(process.cwd(), 'data/clubbings.json');

  constructor(private readonly prisma: PrismaService) {}

  private loadCampaigns(): any[] {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Error reading clubbings.json, falling back to defaults:', err);
    }
    return [...this.fallbackRules];
  }

  private saveCampaigns(campaigns: any[]) {
    try {
      const dir = path.dirname(this.dataFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dataFilePath, JSON.stringify(campaigns, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving clubbings.json:', err);
    }
  }

  async createRule(dto: any) {
    const campaigns = this.loadCampaigns();
    const id = dto.id || (dto.name ? dto.name.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[\s-]+/g, '-') : `clb_${Date.now()}`);

    const desktopImg = dto.bannerImageDesktop || dto.bannerImage || 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80';
    const mobileImg = dto.bannerImageMobile || desktopImg;

    const clubbingProducts = Array.isArray(dto.clubbingProducts) ? dto.clubbingProducts : [];
    const applicableProductIds = Array.isArray(dto.applicableProductIds) && dto.applicableProductIds.length > 0
      ? dto.applicableProductIds
      : clubbingProducts.map((p: any) => p.productId || p.id).filter(Boolean);

    const newCampaign = {
      id,
      name: String(dto.name || '').trim(),
      eventName: String(dto.eventName || dto.name || '').trim(),
      tagline: String(dto.tagline || 'Special Clubbing').trim(),
      description: String(dto.description || '').trim(),
      type: dto.type || 'custom_product_clubbing',
      requiredQuantity: dto.requiredQuantity ? Number(dto.requiredQuantity) : 1,
      fixedPrice: dto.fixedPrice !== undefined && dto.fixedPrice !== null ? Number(dto.fixedPrice) : null,
      percentageOff: dto.percentageOff !== undefined && dto.percentageOff !== null ? Number(dto.percentageOff) : null,
      applicableCategory: dto.applicableCategory || dto.applicableCategoryId || 'all',
      applicableProductIds,
      clubbingProducts,
      bannerImageDesktop: desktopImg,
      bannerImageMobile: mobileImg,
      bannerImage: desktopImg,
      startsAt: dto.startsAt || new Date().toISOString(),
      endsAt: dto.endsAt || null,
      isActive: dto.isActive !== false,
      featuredOnHomepage: dto.featuredOnHomepage !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existingIdx = campaigns.findIndex((c) => c.id === id);
    if (existingIdx !== -1) {
      campaigns[existingIdx] = newCampaign;
    } else {
      campaigns.unshift(newCampaign);
    }

    this.saveCampaigns(campaigns);
    return newCampaign;
  }

  async getAllRules() {
    return this.loadCampaigns();
  }

  async getActiveRules(publicOnly = true) {
    const all = this.loadCampaigns();
    const now = new Date();
    return all.filter((c) => {
      if (!c || c.isActive === false) return false;
      if (c.startsAt && new Date(c.startsAt) > now) return false;
      if (c.endsAt && new Date(c.endsAt) < now) return false;
      return true;
    });
  }

  async getRuleById(id: string) {
    const all = this.loadCampaigns();
    const lower = id.toLowerCase();
    const found = all.find((c) => c.id === id || c.id?.toLowerCase() === lower);
    if (found) return found;

    try {
      const dbRule = await this.prisma.clubbingRule.findUnique({
        where: { id },
        include: { applicableCategory: true, products: { include: { product: true } } },
      });
      if (dbRule) return dbRule;
    } catch {}

    throw new NotFoundException(`Clubbing campaign with ID "${id}" not found`);
  }

  async updateRule(id: string, dto: any) {
    const campaigns = this.loadCampaigns();
    const lower = id.toLowerCase();
    const idx = campaigns.findIndex((c) => c.id === id || c.id?.toLowerCase() === lower);

    if (idx === -1) {
      // If not in file, create it with this id
      return this.createRule({ ...dto, id });
    }

    const existing = campaigns[idx];
    const desktopImg = dto.bannerImageDesktop !== undefined ? dto.bannerImageDesktop : existing.bannerImageDesktop;
    const mobileImg = dto.bannerImageMobile !== undefined ? dto.bannerImageMobile : (existing.bannerImageMobile || desktopImg);

    const clubbingProducts = Array.isArray(dto.clubbingProducts) ? dto.clubbingProducts : existing.clubbingProducts || [];
    const applicableProductIds = Array.isArray(dto.applicableProductIds) && dto.applicableProductIds.length > 0
      ? dto.applicableProductIds
      : clubbingProducts.map((p: any) => p.productId || p.id).filter(Boolean);

    const updated = {
      ...existing,
      ...dto,
      id: existing.id,
      applicableProductIds,
      clubbingProducts,
      bannerImageDesktop: desktopImg,
      bannerImageMobile: mobileImg,
      bannerImage: desktopImg,
      isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : existing.isActive,
      updatedAt: new Date().toISOString(),
    };

    campaigns[idx] = updated;
    this.saveCampaigns(campaigns);
    return updated;
  }

  async toggleRule(id: string) {
    const campaigns = this.loadCampaigns();
    const lower = id.toLowerCase();
    const idx = campaigns.findIndex((c) => c.id === id || c.id?.toLowerCase() === lower);

    if (idx === -1) {
      throw new NotFoundException(`Clubbing campaign with ID "${id}" not found`);
    }

    campaigns[idx].isActive = !campaigns[idx].isActive;
    campaigns[idx].updatedAt = new Date().toISOString();
    this.saveCampaigns(campaigns);
    return campaigns[idx];
  }

  async deleteRule(id: string) {
    const campaigns = this.loadCampaigns();
    const lower = id.toLowerCase();
    const filtered = campaigns.filter((c) => c.id !== id && c.id?.toLowerCase() !== lower);
    this.saveCampaigns(filtered);
    return { success: true, id };
  }

  async bulkDelete(ids: string[]) {
    if (!ids || ids.length === 0) return { count: 0 };
    const idSet = new Set(ids.map((i) => i.toLowerCase()));
    const campaigns = this.loadCampaigns();
    const filtered = campaigns.filter((c) => !idSet.has(c.id?.toLowerCase()));
    const count = campaigns.length - filtered.length;
    this.saveCampaigns(filtered);
    return { count };
  }

  async bulkUpdateStatus(ids: string[], isActive: boolean) {
    if (!ids || ids.length === 0) return { count: 0 };
    const idSet = new Set(ids.map((i) => i.toLowerCase()));
    const campaigns = this.loadCampaigns();
    let count = 0;
    for (const c of campaigns) {
      if (idSet.has(c.id?.toLowerCase())) {
        c.isActive = isActive;
        c.updatedAt = new Date().toISOString();
        count++;
      }
    }
    this.saveCampaigns(campaigns);
    return { count };
  }

  private async findActiveRulesInternal(onlyWithoutCode = false) {
    const now = new Date();
    try {
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
    } catch {
      return this.getActiveRules();
    }
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
