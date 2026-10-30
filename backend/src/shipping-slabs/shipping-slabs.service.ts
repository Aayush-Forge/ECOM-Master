import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingSlabDto } from './dto/create-shipping-slab.dto';
import { UpdateShippingSlabDto } from './dto/update-shipping-slab.dto';
import { CalculateShippingDto } from './dto/calculate-shipping.dto';

export interface ShippingSlabModel {
  id: string;
  name: string;
  minWeight: number;
  maxWeight: number;
  destinationRegion: string;
  rate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ShippingSlabsService {
  private fallbackSlabs: ShippingSlabModel[] = [
    {
      id: 'slab_001',
      name: 'Standard Light - North Zone',
      minWeight: 0,
      maxWeight: 0.5,
      destinationRegion: 'North India',
      rate: 49,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'slab_002',
      name: 'Standard National - Light',
      minWeight: 0,
      maxWeight: 0.5,
      destinationRegion: 'National',
      rate: 59,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'slab_003',
      name: 'Standard Medium - All India',
      minWeight: 0.5,
      maxWeight: 2.0,
      destinationRegion: 'National',
      rate: 79,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'slab_004',
      name: 'Express Heavy Parcel',
      minWeight: 2.0,
      maxWeight: 10.0,
      destinationRegion: 'National',
      rate: 149,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'slab_005',
      name: 'Bulk Commercial Cargo',
      minWeight: 10.0,
      maxWeight: 50.0,
      destinationRegion: 'National',
      rate: 299,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async createSlab(dto: CreateShippingSlabDto): Promise<any> {
    try {
      return await this.prisma.shippingSlab.create({
        data: {
          name: dto.name,
          minWeight: Number(dto.minWeight),
          maxWeight: Number(dto.maxWeight),
          destinationRegion: dto.destinationRegion,
          rate: Number(dto.rate),
          isActive: dto.isActive !== undefined ? dto.isActive : true,
        },
      });
    } catch (err: any) {
      const newSlab: ShippingSlabModel = {
        id: `slab_${Date.now()}`,
        name: dto.name,
        minWeight: Number(dto.minWeight),
        maxWeight: Number(dto.maxWeight),
        destinationRegion: dto.destinationRegion,
        rate: Number(dto.rate),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.fallbackSlabs.unshift(newSlab);
      return newSlab;
    }
  }

  async getAllSlabs(): Promise<any[]> {
    try {
      const dbSlabs = await this.prisma.shippingSlab.findMany({
        orderBy: { minWeight: 'asc' },
      });
      if (dbSlabs.length > 0) return dbSlabs;
      return this.fallbackSlabs;
    } catch {
      return this.fallbackSlabs;
    }
  }

  async getActiveSlabs(): Promise<any[]> {
    try {
      const dbSlabs = await this.prisma.shippingSlab.findMany({
        where: { isActive: true },
        orderBy: { minWeight: 'asc' },
      });
      if (dbSlabs.length > 0) return dbSlabs;
      return this.fallbackSlabs.filter((s) => s.isActive);
    } catch {
      return this.fallbackSlabs.filter((s) => s.isActive);
    }
  }

  async getSlabById(id: string): Promise<any> {
    try {
      const slab = await this.prisma.shippingSlab.findUnique({ where: { id } });
      if (slab) return slab;
    } catch {}

    const fallback = this.fallbackSlabs.find((s) => s.id === id);
    if (!fallback) throw new NotFoundException('Shipping slab not found');
    return fallback;
  }

  async updateSlab(id: string, dto: UpdateShippingSlabDto): Promise<any> {
    try {
      const updateData: any = {};
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.minWeight !== undefined) updateData.minWeight = Number(dto.minWeight);
      if (dto.maxWeight !== undefined) updateData.maxWeight = Number(dto.maxWeight);
      if (dto.destinationRegion !== undefined) updateData.destinationRegion = dto.destinationRegion;
      if (dto.rate !== undefined) updateData.rate = Number(dto.rate);
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      return await this.prisma.shippingSlab.update({
        where: { id },
        data: updateData,
      });
    } catch (err: any) {
      const idx = this.fallbackSlabs.findIndex((s) => s.id === id);
      if (idx === -1) throw new NotFoundException('Shipping slab not found');
      this.fallbackSlabs[idx] = {
        ...this.fallbackSlabs[idx],
        ...dto,
        updatedAt: new Date(),
      };
      return this.fallbackSlabs[idx];
    }
  }

  async toggleStatus(id: string): Promise<any> {
    const slab = await this.getSlabById(id);
    return this.updateSlab(id, { isActive: !slab.isActive });
  }

  async deleteSlab(id: string): Promise<any> {
    try {
      return await this.prisma.shippingSlab.delete({ where: { id } });
    } catch {
      const idx = this.fallbackSlabs.findIndex((s) => s.id === id);
      if (idx === -1) throw new NotFoundException('Shipping slab not found');
      return this.fallbackSlabs.splice(idx, 1)[0];
    }
  }

  async calculateRate(dto: CalculateShippingDto): Promise<{
    rate: number;
    shippingFee: number;
    slabName: string;
    slabId: string;
    slab?: any;
    matched: boolean;
    isFree: boolean;
    freeShippingApplied: boolean;
    freeShippingThreshold: number;
  }> {
    const weight = Number(dto.weight) || 0.5;
    const region = (dto.destinationRegion || '').toLowerCase();
    const subtotal = Number(dto.orderSubtotal) || 0;

    // Free delivery above ₹499 check
    if (subtotal >= 499) {
      return {
        rate: 0,
        shippingFee: 0,
        slabName: 'Free Delivery Promo (Order > ₹499)',
        slabId: 'promo_free_shipping',
        slab: { name: 'Free Delivery Promo (Order > ₹499)', rate: 0 },
        matched: true,
        isFree: true,
        freeShippingApplied: true,
        freeShippingThreshold: 499,
      };
    }

    const slabs = await this.getActiveSlabs();

    // 1. Find slabs matching weight: minWeight <= weight <= maxWeight
    let weightMatched = slabs.filter((s) => weight >= s.minWeight && weight <= s.maxWeight);

    // If weight exceeds all slabs, use the highest slab
    if (weightMatched.length === 0 && slabs.length > 0) {
      const sortedByMax = [...slabs].sort((a, b) => b.maxWeight - a.maxWeight);
      weightMatched = [sortedByMax[0]];
    }

    // 2. Resolve regional zone from pincode prefixes or state names
    const isNorthIndia =
      region.includes('north') ||
      region.includes('delhi') ||
      region.includes('noida') ||
      region.includes('gurgaon') ||
      region.includes('haryana') ||
      region.includes('punjab') ||
      region.includes('uttar pradesh') ||
      region.includes('rajasthan') ||
      /^(11|12|13|14|15|16|17|18|19|20|24|25)/.test(region.trim());

    // 3. Region match preference
    let selectedSlab = weightMatched.find((s) => {
      const slabRegion = s.destinationRegion.toLowerCase();
      if (isNorthIndia && (slabRegion.includes('north') || slabRegion.includes('delhi'))) {
        return true;
      }
      return region.includes(slabRegion) || slabRegion.includes(region);
    });

    // Fallback to "National" or first weight match
    if (!selectedSlab) {
      selectedSlab =
        weightMatched.find(
          (s) =>
            s.destinationRegion.toLowerCase() === 'national' ||
            s.destinationRegion.toLowerCase().includes('all india'),
        ) || weightMatched[0];
    }

    if (selectedSlab) {
      return {
        rate: selectedSlab.rate,
        shippingFee: selectedSlab.rate,
        slabName: selectedSlab.name,
        slabId: selectedSlab.id,
        slab: selectedSlab,
        matched: true,
        isFree: false,
        freeShippingApplied: false,
        freeShippingThreshold: 499,
      };
    }

    // Final default fallback
    return {
      rate: 79,
      shippingFee: 79,
      slabName: 'Standard Shipping (Default Flat Rate)',
      slabId: 'fallback_default',
      slab: { name: 'Standard Shipping (Default Flat Rate)', rate: 79 },
      matched: false,
      isFree: false,
      freeShippingApplied: false,
      freeShippingThreshold: 499,
    };
  }
}
