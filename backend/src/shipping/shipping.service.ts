import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ShippingRateType, ShippingTemplate } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingTemplateDto } from './dto/create-shipping-template.dto';
import { UpdateShippingTemplateDto } from './dto/update-shipping-template.dto';
import { ShippingSlabDto } from './dto/shipping-slab.dto';

export interface ShippingCalculationItem {
  productId: string;
  variationId?: string | null;
  quantity: number;
  price: number;
  weight?: number | null;
  shippingTemplateId?: string | null;
}

export interface ShippingTemplateSnapshot {
  templateId: string;
  templateName: string;
  carrierName?: string;
  rateType: ShippingRateType;
  charge: number;
  isFreeShipping: boolean;
  totalWeight: number;
  totalValue: number;
  freeShippingThreshold: number | null;
  matchedSlab: ShippingSlabDto | null;
  itemCount: number;
}

export interface ShippingCalculationResult {
  shippingTotal: number;
  shippingTemplateName: string;
  shippingCarrier?: string;
  shippingSnapshot: {
    templates: ShippingTemplateSnapshot[];
    totalShippingCharge: number;
  };
  weightError?: string | null;
}

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeDisabled = true) {
    return this.prisma.shippingTemplate.findMany({
      where: includeDisabled ? undefined : { isEnabled: true },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.shippingTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Shipping template with ID "${id}" not found`);
    }

    return template;
  }

  async getDefaultTemplate(): Promise<ShippingTemplate> {
    const defaultTemplate = await this.prisma.shippingTemplate.findFirst({
      where: { isDefault: true, isEnabled: true },
    });

    if (defaultTemplate) {
      return defaultTemplate;
    }

    const firstEnabled = await this.prisma.shippingTemplate.findFirst({
      where: { isEnabled: true },
      orderBy: { createdAt: 'asc' },
    });

    if (firstEnabled) {
      return firstEnabled;
    }

    // Ultimate fallback if table is somehow empty
    return {
      id: 'default-fallback',
      name: 'Standard Delivery',
      carrierName: 'Standard Delivery',
      rateType: ShippingRateType.order_value,
      slabs: [
        { upTo: 499, charge: 49 },
        { upTo: null, charge: 0 },
      ] as Prisma.JsonValue,
      freeShippingThreshold: new Prisma.Decimal(499),
      isDefault: true,
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async create(dto: CreateShippingTemplateDto) {
    const normalizedSlabs = this.validateAndNormalizeSlabs(
      dto.slabs,
      dto.rateType ?? ShippingRateType.order_value,
    );

    const count = await this.prisma.shippingTemplate.count();
    const shouldBeDefault = dto.isDefault ?? count === 0;

    return this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.shippingTemplate.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.shippingTemplate.create({
        data: {
          name: dto.name.trim(),
          carrierName: dto.carrierName ? dto.carrierName.trim() : '',
          rateType: dto.rateType ?? ShippingRateType.order_value,
          slabs: normalizedSlabs as unknown as Prisma.InputJsonValue,
          freeShippingThreshold:
            dto.freeShippingThreshold !== undefined &&
            dto.freeShippingThreshold !== null
              ? new Prisma.Decimal(dto.freeShippingThreshold)
              : null,
          isDefault: shouldBeDefault,
          isEnabled: dto.isEnabled ?? true,
        },
      });
    });
  }

  async update(id: string, dto: UpdateShippingTemplateDto) {
    const existing = await this.findOne(id);

    const targetRateType = dto.rateType ?? existing.rateType;
    let normalizedSlabs: ShippingSlabDto[] | undefined;

    if (dto.slabs) {
      normalizedSlabs = this.validateAndNormalizeSlabs(
        dto.slabs,
        targetRateType,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.shippingTemplate.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      } else if (dto.isDefault === false && existing.isDefault) {
        const otherTemplates = await tx.shippingTemplate.count({
          where: { id: { not: id } },
        });
        if (otherTemplates > 0) {
          throw new BadRequestException(
            'Cannot unset the only default shipping template. Please designate another template as default.',
          );
        }
      }

      const dataToUpdate: Prisma.ShippingTemplateUpdateInput = {};

      if (dto.name !== undefined) dataToUpdate.name = dto.name.trim();
      if (dto.carrierName !== undefined) dataToUpdate.carrierName = dto.carrierName.trim();
      if (dto.rateType !== undefined) dataToUpdate.rateType = dto.rateType;
      if (normalizedSlabs) dataToUpdate.slabs = normalizedSlabs as unknown as Prisma.InputJsonValue;
      if (dto.freeShippingThreshold !== undefined) {
        dataToUpdate.freeShippingThreshold =
          dto.freeShippingThreshold !== null
            ? new Prisma.Decimal(dto.freeShippingThreshold)
            : null;
      }
      if (dto.isDefault !== undefined) dataToUpdate.isDefault = dto.isDefault;
      if (dto.isEnabled !== undefined) dataToUpdate.isEnabled = dto.isEnabled;

      return tx.shippingTemplate.update({
        where: { id },
        data: dataToUpdate,
      });
    });
  }

  async setDefault(id: string) {
    const existing = await this.findOne(id);
    if (!existing.isEnabled) {
      throw new BadRequestException('Cannot set a disabled template as default');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.shippingTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      await tx.shippingTemplate.update({
        where: { id },
        data: { isDefault: true },
      });
    });

    return { success: true, message: `"${existing.name}" is now the default shipping template` };
  }

  async remove(id: string) {
    const existing = await this.findOne(id);

    if (existing.isDefault) {
      throw new BadRequestException(
        'Cannot delete default shipping template. Please designate another template as default first.',
      );
    }

    return this.prisma.shippingTemplate.delete({
      where: { id },
    });
  }

  async calculateShipping(
    items: ShippingCalculationItem[],
    cartSubtotal: number,
    options: { throwOnError?: boolean } = {},
  ): Promise<ShippingCalculationResult> {
    const throwOnError = options.throwOnError ?? true;

    if (!items || items.length === 0 || cartSubtotal <= 0) {
      return {
        shippingTotal: 0,
        shippingTemplateName: '',
        shippingCarrier: '',
        shippingSnapshot: {
          templates: [],
          totalShippingCharge: 0,
        },
      };
    }

    const templateIds = Array.from(
      new Set(
        items
          .map((i) => i.shippingTemplateId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const dbTemplates = templateIds.length > 0
      ? await this.prisma.shippingTemplate.findMany({
          where: { id: { in: templateIds }, isEnabled: true },
        })
      : [];

    const templateMap = new Map(dbTemplates.map((t) => [t.id, t]));
    const defaultTemplate = await this.getDefaultTemplate();

    // Group items by effective template
    const templateGroups = new Map<string, {
      template: ShippingTemplate;
      items: ShippingCalculationItem[];
      totalWeight: number;
      totalValue: number;
    }>();

    for (const item of items) {
      let template: ShippingTemplate;
      if (item.shippingTemplateId && templateMap.has(item.shippingTemplateId)) {
        template = templateMap.get(item.shippingTemplateId)!;
      } else {
        template = defaultTemplate;
      }

      const itemWeight = Math.max(0, Number(item.weight || 0));
      const itemTotalWeight = itemWeight * item.quantity;
      const itemTotalValue = Number(item.price || 0) * item.quantity;

      if (!templateGroups.has(template.id)) {
        templateGroups.set(template.id, {
          template,
          items: [],
          totalWeight: 0,
          totalValue: 0,
        });
      }

      const group = templateGroups.get(template.id)!;
      group.items.push(item);
      group.totalWeight += itemTotalWeight;
      group.totalValue += itemTotalValue;
    }

    let totalShippingCharge = 0;
    const templateSnapshots: ShippingTemplateSnapshot[] = [];
    const templateNames: string[] = [];
    const carrierNames: string[] = [];

    for (const group of templateGroups.values()) {
      const { template, totalWeight, totalValue } = group;
      templateNames.push(template.name);
      if (template.carrierName && !carrierNames.includes(template.carrierName)) {
        carrierNames.push(template.carrierName);
      }

      const freeThreshold = template.freeShippingThreshold !== null
        ? Number(template.freeShippingThreshold)
        : null;

      // Free shipping threshold is checked against the whole cart subtotal
      const isFreeShipping =
        freeThreshold !== null && cartSubtotal >= freeThreshold;

      let templateCharge = 0;
      let matchedSlab: ShippingSlabDto | null = null;

      if (isFreeShipping) {
        templateCharge = 0;
      } else {
        const rawSlabs = Array.isArray(template.slabs)
          ? (template.slabs as unknown as ShippingSlabDto[])
          : [];
        const slabs = this.sortSlabs(rawSlabs, template.rateType);

        if (template.rateType === ShippingRateType.weight) {
          // Weight-based slabs: find first slab where totalWeight <= slab.upTo
          const found = slabs.find(
            (s) => s.upTo !== null && s.upTo !== undefined && totalWeight <= Number(s.upTo),
          );

          if (found) {
            templateCharge = Number(found.charge);
            matchedSlab = found;
          } else {
            // Weight beyond the last slab: block checkout with clear error
            const maxSlabWeight = slabs.length > 0 ? slabs[slabs.length - 1].upTo : 0;
            const errorMsg = `Order weight (${totalWeight.toFixed(2)} kg) exceeds the maximum shipping weight limit (${maxSlabWeight} kg) for template "${template.name}".`;

            if (throwOnError) {
              throw new BadRequestException(errorMsg);
            }

            return {
              shippingTotal: 0,
              shippingTemplateName: template.name,
              shippingCarrier: template.carrierName || undefined,
              shippingSnapshot: {
                templates: [],
                totalShippingCharge: 0,
              },
              weightError: errorMsg,
            };
          }
        } else {
          // Order value based slabs: find first slab where totalValue <= slab.upTo or slab.upTo is null
          const found = slabs.find(
            (s) => s.upTo === null || s.upTo === undefined || totalValue <= Number(s.upTo),
          );

          if (found) {
            templateCharge = Number(found.charge);
            matchedSlab = found;
          } else {
            const lastSlab = slabs[slabs.length - 1];
            templateCharge = lastSlab ? Number(lastSlab.charge) : 0;
            matchedSlab = lastSlab || null;
          }
        }
      }

      totalShippingCharge += templateCharge;
      templateSnapshots.push({
        templateId: template.id,
        templateName: template.name,
        carrierName: template.carrierName || undefined,
        rateType: template.rateType,
        charge: templateCharge,
        isFreeShipping,
        totalWeight,
        totalValue,
        freeShippingThreshold: freeThreshold,
        matchedSlab,
        itemCount: group.items.length,
      });
    }

    return {
      shippingTotal: Math.round(totalShippingCharge * 100) / 100,
      shippingTemplateName: templateNames.join(', '),
      shippingCarrier: carrierNames.length > 0 ? carrierNames.join(', ') : undefined,
      shippingSnapshot: {
        templates: templateSnapshots,
        totalShippingCharge: Math.round(totalShippingCharge * 100) / 100,
      },
    };
  }

  private validateAndNormalizeSlabs(
    slabs: ShippingSlabDto[],
    rateType: ShippingRateType,
  ): ShippingSlabDto[] {
    if (!slabs || !Array.isArray(slabs) || slabs.length === 0) {
      throw new BadRequestException('At least one rate slab is required');
    }

    for (const slab of slabs) {
      if (slab.charge === undefined || slab.charge === null || slab.charge < 0) {
        throw new BadRequestException('Slab charge must be a non-negative number');
      }
    }

    if (rateType === ShippingRateType.weight) {
      for (const slab of slabs) {
        if (slab.upTo === undefined || slab.upTo === null || Number(slab.upTo) <= 0) {
          throw new BadRequestException(
            'Weight slabs must specify an upper limit (kg) greater than 0',
          );
        }
      }

      for (let i = 1; i < slabs.length; i++) {
        if (Number(slabs[i].upTo) <= Number(slabs[i - 1].upTo)) {
          throw new BadRequestException('Weight slabs must have strictly increasing weight thresholds');
        }
      }

      return slabs.map((s) => ({
        upTo: Number(s.upTo),
        charge: Number(s.charge),
      }));
    } else {
      // order_value
      for (let i = 0; i < slabs.length - 1; i++) {
        if (slabs[i].upTo === null || slabs[i].upTo === undefined) {
          throw new BadRequestException(
            'Only the last slab in an order-value template can be open-ended ("and above")',
          );
        }
      }

      for (let i = 1; i < slabs.length; i++) {
        if (slabs[i].upTo !== null && slabs[i - 1].upTo !== null) {
          if (Number(slabs[i].upTo) <= Number(slabs[i - 1].upTo)) {
            throw new BadRequestException(
              'Order value slabs must have strictly increasing value thresholds',
            );
          }
        }
      }

      return slabs.map((s) => ({
        upTo: s.upTo !== null && s.upTo !== undefined ? Number(s.upTo) : null,
        charge: Number(s.charge),
      }));
    }
  }

  private sortSlabs(slabs: ShippingSlabDto[], rateType: ShippingRateType): ShippingSlabDto[] {
    return [...slabs].sort((a, b) => {
      if (a.upTo === null || a.upTo === undefined) return 1;
      if (b.upTo === null || b.upTo === undefined) return -1;
      return Number(a.upTo) - Number(b.upTo);
    });
  }
}
