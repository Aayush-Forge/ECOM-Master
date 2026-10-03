import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import sanitizeHtml from 'sanitize-html';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ProductStatus, ProductType } from '@prisma/client';
import { AuditLogsService } from '../audit/audit-logs.service';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['b', 'strong', 'i', 'em', 'ul', 'ol', 'li', 'p', 'br'],
  allowedAttributes: {},
};

export function sanitizeRichText(html?: string): string {
  if (!html) return '';
  return sanitizeHtml(html, SANITIZE_OPTIONS).trim();
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prismaService: PrismaService,
    @Optional() private readonly auditLogsService?: AuditLogsService,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const category = await this.prismaService.category.findUnique({
      where: { id: createProductDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const isVariable = createProductDto.productType === ProductType.variable;

    if (!isVariable) {
      if (createProductDto.basePrice === undefined || createProductDto.basePrice === null) {
        throw new BadRequestException('basePrice is required for simple products');
      }
    }

    return await this.prismaService.$transaction(async (tx) => {
      // Transaction-level guard against concurrent duplicate SKU creations
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('product_sku_lock'));`);

      const parentSku = createProductDto.sku?.trim()
        ? createProductDto.sku.trim().toUpperCase()
        : await this.generateSku();

      // Check parent SKU uniqueness vs Product.sku
      const existingParent = await tx.product.findUnique({
        where: { sku: parentSku },
      });
      if (existingParent) {
        throw new ConflictException(`Product SKU "${parentSku}" already exists`);
      }

      // Check parent SKU uniqueness vs any existing variation SKU in DB
      const parentVarConflict = await tx.$queryRawUnsafe<any[]>(
        `SELECT id FROM products WHERE variations @> $1::jsonb LIMIT 1`,
        JSON.stringify([{ sku: parentSku }]),
      );
      if (parentVarConflict && parentVarConflict.length > 0) {
        throw new ConflictException(`Product SKU "${parentSku}" conflicts with an existing variation SKU`);
      }

      let variationsData: any[] | null = null;
      let attributesData: any[] | null = null;
      let finalBasePrice = createProductDto.basePrice ?? 0;
      let finalStockQuantity = createProductDto.stockQuantity ?? 0;

      if (isVariable) {
        if (!createProductDto.variations || createProductDto.variations.length === 0) {
          throw new BadRequestException('Variable product must have at least one variation');
        }
        if (!createProductDto.attributes || createProductDto.attributes.length === 0) {
          throw new BadRequestException('Variable product must declare attributes');
        }

        this.validateVariableAttributesAndCombinations(createProductDto.attributes, createProductDto.variations);

        // Process variations
        const processedVariations: any[] = [];
        let maxSuffix = 0;

        // First pass: identify max numeric suffix among provided SKUs matching parentSku-XX
        for (const v of createProductDto.variations) {
          if (v.sku && v.sku.trim()) {
            const match = v.sku.trim().toUpperCase().match(new RegExp(`^${parentSku}-(\\d+)$`));
            if (match) {
              const suffixNum = parseInt(match[1], 10);
              if (!isNaN(suffixNum) && suffixNum > maxSuffix) {
                maxSuffix = suffixNum;
              }
            }
          }
        }

        // Second pass: assign server-side UUID, generate blank SKUs, format
        for (const v of createProductDto.variations) {
          const variantId = randomUUID();
          let variantSku: string;

          if (v.sku && v.sku.trim()) {
            variantSku = v.sku.trim().toUpperCase();
          } else {
            maxSuffix += 1;
            variantSku = await this.generateSku(parentSku, maxSuffix);
          }

          const regPrice = Number(v.regularPrice);
          const salePrice = v.salePrice !== undefined && v.salePrice !== null ? Number(v.salePrice) : null;
          const stock = v.stockQuantity !== undefined && v.stockQuantity !== null ? Number(v.stockQuantity) : 0;

          processedVariations.push({
            id: variantId,
            sku: variantSku,
            regularPrice: regPrice,
            salePrice,
            stockQuantity: stock,
            weight: v.weight !== undefined && v.weight !== null ? Number(v.weight) : null,
            image: v.image ?? null,
            attributes: v.attributes.map((a) => ({
              name: a.name.trim(),
              option: a.option.trim(),
            })),
            isActive: true,
          });
        }

        // Validate SKU uniqueness for all variations in this batch
        await this.assertVariationSkuUniqueness(tx, parentSku, processedVariations);

        // Recompute parent basePrice and stockQuantity from active variations
        const effectivePrices = processedVariations.map((v) => {
          return v.salePrice !== null && v.salePrice < v.regularPrice ? v.salePrice : v.regularPrice;
        });
        finalBasePrice = Math.min(...effectivePrices);
        finalStockQuantity = processedVariations.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);

        variationsData = processedVariations;
        attributesData = createProductDto.attributes;
      }

      try {
        const created = await tx.product.create({
          data: {
            sku: parentSku,
            title: createProductDto.title,
            slug: createProductDto.slug,
            description: createProductDto.description
              ? sanitizeRichText(createProductDto.description)
              : '',
            shortDescription: createProductDto.shortDescription
              ? sanitizeRichText(createProductDto.shortDescription)
              : '',
            basePrice: finalBasePrice,
            compareAtPrice: createProductDto.compareAtPrice,
            salePrice: createProductDto.salePrice,
            weight: createProductDto.weight,
            length: createProductDto.length,
            width: createProductDto.width,
            height: createProductDto.height,
            categoryId: createProductDto.categoryId,
            status: createProductDto.status ?? ProductStatus.draft,
            images: createProductDto.images ?? [],
            customFields: (createProductDto.customFields ?? {}) as Prisma.InputJsonValue,
            stockQuantity: finalStockQuantity,
            productType: createProductDto.productType ?? ProductType.simple,
            attributes: attributesData ? (attributesData as Prisma.InputJsonValue) : Prisma.JsonNull,
            variations: variationsData ? (variationsData as Prisma.InputJsonValue) : Prisma.JsonNull,
            version: 1,
          },
        });

        return this.transformProductResponse(created, true);
      } catch (err: any) {
        if (err instanceof ConflictException || err instanceof BadRequestException) {
          throw err;
        }
        if (err.code === 'P2002') {
          throw new ConflictException('SKU or slug already exists');
        }
        throw err;
      }
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    if (updateProductDto.categoryId) {
      const category = await this.prismaService.category.findUnique({
        where: { id: updateProductDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    return await this.prismaService.$transaction(async (tx) => {
      // Transaction-level guard against concurrent SKU / update conflicts
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('product_sku_lock'));`);

      const existing = await tx.product.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new NotFoundException('Product not found');
      }

      const targetType = updateProductDto.productType ?? existing.productType;
      const isVariable = targetType === ProductType.variable;

      // Optimistic lock check: variable-product update requires version; mismatch -> 409
      if (isVariable) {
        if (updateProductDto.version === undefined) {
          throw new ConflictException('Product version is required for variable product updates');
        }
        if (existing.version !== updateProductDto.version) {
          throw new ConflictException(
            `Product version mismatch. Current version: ${existing.version}, provided: ${updateProductDto.version}`,
          );
        }
      }

      const nextVersion = existing.version + 1;

      const parentSku = updateProductDto.sku?.trim()
        ? updateProductDto.sku.trim().toUpperCase()
        : existing.sku;

      // If parent SKU changed, check uniqueness
      if (parentSku !== existing.sku) {
        const skuConflict = await tx.product.findFirst({
          where: { sku: parentSku, id: { not: id } },
        });
        if (skuConflict) {
          throw new ConflictException(`Product SKU "${parentSku}" already exists`);
        }
        const parentVarConflict = await tx.$queryRawUnsafe<any[]>(
          `SELECT id FROM products WHERE id != $1::uuid AND variations @> $2::jsonb LIMIT 1`,
          id,
          JSON.stringify([{ sku: parentSku }]),
        );
        if (parentVarConflict && parentVarConflict.length > 0) {
          throw new ConflictException(`Product SKU "${parentSku}" conflicts with an existing variation SKU`);
        }
      }

      let variationsData: any[] | null = existing.variations as any[];
      let attributesData: any[] | null = existing.attributes as any[];
      let finalBasePrice = updateProductDto.basePrice ?? existing.basePrice;
      let finalStockQuantity = updateProductDto.stockQuantity ?? existing.stockQuantity;

      if (isVariable) {
        const incomingAttributes = updateProductDto.attributes ?? attributesData ?? [];
        const incomingVariations = updateProductDto.variations;

        if (incomingVariations !== undefined) {
          if (incomingVariations.length === 0) {
            throw new BadRequestException('Variable product must have at least one variation');
          }
          if (incomingAttributes.length === 0) {
            throw new BadRequestException('Variable product must declare attributes');
          }

          this.validateVariableAttributesAndCombinations(incomingAttributes, incomingVariations);

          const existingVariationsList = Array.isArray(existing.variations)
            ? (existing.variations as any[])
            : [];
          const existingVariationsMap = new Map<string, any>(
            existingVariationsList.map((v) => [v.id, v]),
          );

          // Find max suffix among existing variations and incoming variations
          let maxSuffix = 0;
          for (const ev of existingVariationsList) {
            if (ev.sku) {
              const match = ev.sku.toUpperCase().match(new RegExp(`^${parentSku}-(\\d+)$`));
              if (match) {
                const s = parseInt(match[1], 10);
                if (!isNaN(s) && s > maxSuffix) maxSuffix = s;
              }
            }
          }
          for (const iv of incomingVariations) {
            if (iv.sku && iv.sku.trim()) {
              const match = iv.sku.trim().toUpperCase().match(new RegExp(`^${parentSku}-(\\d+)$`));
              if (match) {
                const s = parseInt(match[1], 10);
                if (!isNaN(s) && s > maxSuffix) maxSuffix = s;
              }
            }
          }

          const processedActiveVariations: any[] = [];
          const incomingIds = new Set<string>();

          for (const iv of incomingVariations) {
            let variantId: string;
            let variantSku: string;

            if (iv.id && existingVariationsMap.has(iv.id)) {
              // Existing variation: preserve immutable ID
              variantId = iv.id;
              incomingIds.add(variantId);
              const exVar = existingVariationsMap.get(variantId)!;

              if (iv.sku && iv.sku.trim()) {
                variantSku = iv.sku.trim().toUpperCase();
              } else {
                variantSku = exVar.sku; // Never regenerate existing SKU
              }
            } else {
              // New variation: id = randomUUID
              variantId = randomUUID();
              if (iv.sku && iv.sku.trim()) {
                variantSku = iv.sku.trim().toUpperCase();
              } else {
                maxSuffix += 1;
                variantSku = await this.generateSku(parentSku, maxSuffix);
              }
            }

            const regPrice = Number(iv.regularPrice);
            const salePrice =
              iv.salePrice !== undefined && iv.salePrice !== null ? Number(iv.salePrice) : null;
            const stock =
              iv.stockQuantity !== undefined && iv.stockQuantity !== null
                ? Number(iv.stockQuantity)
                : 0;

            processedActiveVariations.push({
              id: variantId,
              sku: variantSku,
              regularPrice: regPrice,
              salePrice,
              stockQuantity: stock,
              weight: iv.weight !== undefined && iv.weight !== null ? Number(iv.weight) : null,
              image: iv.image ?? null,
              attributes: iv.attributes.map((a) => ({
                name: a.name.trim(),
                option: a.option.trim(),
              })),
              isActive: iv.isActive !== undefined ? Boolean(iv.isActive) : true,
            });
          }

          // Rule: Variations omitted from an update payload are set isActive=false, never deleted.
          const inactiveOmittedVariations: any[] = [];
          for (const exVar of existingVariationsList) {
            if (!incomingIds.has(exVar.id)) {
              inactiveOmittedVariations.push({
                ...exVar,
                isActive: false,
              });
            }
          }

          const allVariations = [...processedActiveVariations, ...inactiveOmittedVariations];

          // Variable product must retain at least one active variation
          const activeVariations = allVariations.filter((v: any) => v.isActive !== false);
          if (activeVariations.length === 0) {
            throw new BadRequestException('Variable product must have at least one active variation');
          }

          // Check SKU uniqueness across all active + inactive variations of this product
          await this.assertVariationSkuUniqueness(tx, parentSku, allVariations, id);

          // Recompute parent basePrice and stockQuantity from active variations only
          const effectivePrices = activeVariations.map((v) => {
            return v.salePrice !== null && v.salePrice < v.regularPrice
              ? v.salePrice
              : v.regularPrice;
          });
          finalBasePrice = Math.min(...effectivePrices);
          finalStockQuantity = activeVariations.reduce(
            (sum, v) => sum + (v.stockQuantity || 0),
            0,
          );

          variationsData = allVariations;
          attributesData = incomingAttributes;

          // Audit log for variant sku/price/stock changes
          if (this.auditLogsService) {
            const beforeSnap = existingVariationsList.map((v) => ({
              id: v.id,
              sku: v.sku,
              regularPrice: v.regularPrice,
              salePrice: v.salePrice,
              stockQuantity: v.stockQuantity,
              isActive: v.isActive,
            }));
            const afterSnap = allVariations.map((v) => ({
              id: v.id,
              sku: v.sku,
              regularPrice: v.regularPrice,
              salePrice: v.salePrice,
              stockQuantity: v.stockQuantity,
              isActive: v.isActive,
            }));

            if (JSON.stringify(beforeSnap) !== JSON.stringify(afterSnap)) {
              await this.auditLogsService.createLog({
                userId: 'system',
                userRole: 'admin',
                actionType: 'PRODUCT_VARIATION_UPDATE',
                entityType: 'product',
                entityId: id,
                beforeValue: { variations: beforeSnap, version: existing.version },
                afterValue: { variations: afterSnap, version: nextVersion },
              });
            }
          }
        }
      }

      const dataToUpdate: any = {
        ...updateProductDto,
        sku: parentSku,
        version: nextVersion,
        basePrice: finalBasePrice,
        stockQuantity: finalStockQuantity,
        productType: targetType,
        attributes: attributesData ? (attributesData as Prisma.InputJsonValue) : undefined,
        variations: variationsData ? (variationsData as Prisma.InputJsonValue) : undefined,
      };

      if (updateProductDto.description !== undefined) {
        dataToUpdate.description = sanitizeRichText(updateProductDto.description);
      }
      if (updateProductDto.shortDescription !== undefined) {
        dataToUpdate.shortDescription = sanitizeRichText(updateProductDto.shortDescription);
      }
      if (updateProductDto.customFields !== undefined) {
        dataToUpdate.customFields = updateProductDto.customFields as Prisma.InputJsonValue;
      }

      const updated = await tx.product.update({
        where: { id },
        data: dataToUpdate,
      });

      return this.transformProductResponse(updated, true);
    });
  }

  async findAll(page = 1, perPage = 20, isAdmin = false) {
    const whereClause = isAdmin ? {} : { status: ProductStatus.active };
    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.product.findMany({
        where: whereClause,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prismaService.product.count({
        where: whereClause,
      }),
    ]);
    return {
      data: data.map((p) => this.transformProductResponse(p, isAdmin)),
      meta: { page, per_page: perPage, total },
    };
  }

  async findOne(idOrSlug: string, isAdmin = false) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);

    const baseWhere = isUuid
      ? { OR: [{ id: idOrSlug }, { slug: idOrSlug }, { sku: idOrSlug }] }
      : { OR: [{ slug: idOrSlug }, { sku: idOrSlug }] };

    const where = isAdmin
      ? baseWhere
      : { AND: [baseWhere, { status: ProductStatus.active }] };

    const product = await this.prismaService.product.findFirst({
      where,
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.transformProductResponse(product, isAdmin);
  }

  async remove(id: string) {
    const existing = await this.prismaService.product.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    try {
      return await this.prismaService.product.delete({
        where: { id },
      });
    } catch {
      // If product is referenced by historical orders, soft-archive instead of failing with 500
      return await this.prismaService.product.update({
        where: { id },
        data: { status: ProductStatus.archived },
      });
    }
  }

  async generateSku(parentSku?: string, variantIndex?: number): Promise<string> {
    if (parentSku && variantIndex !== undefined) {
      const suffix = String(variantIndex).padStart(2, '0');
      return `${parentSku}-${suffix}`;
    }

    try {
      const result = await this.prismaService.$queryRawUnsafe<{ nextval: string | number | bigint }[]>(
        `SELECT nextval('product_sku_seq') AS nextval`,
      );
      if (result?.[0]?.nextval != null) {
        return `SME${result[0].nextval}`;
      }
    } catch {
      try {
        await this.prismaService.$executeRawUnsafe(
          `CREATE SEQUENCE IF NOT EXISTS product_sku_seq START WITH 10001 INCREMENT BY 1;`,
        );
        const result = await this.prismaService.$queryRawUnsafe<{ nextval: string | number | bigint }[]>(
          `SELECT nextval('product_sku_seq') AS nextval`,
        );
        if (result?.[0]?.nextval != null) {
          return `SME${result[0].nextval}`;
        }
      } catch (retryError) {
        console.error('Failed to generate sequence-based SKU:', retryError);
      }
    }

    const count = await this.prismaService.product.count();
    const fallbackNumber = 10001 + count;
    return `SME${fallbackNumber}`;
  }

  async getNextSuggestedSku(): Promise<{ sku: string }> {
    try {
      const result = await this.prismaService.$queryRawUnsafe<{
        last_value: string | number | bigint;
        is_called: boolean;
      }[]>(`SELECT last_value, is_called FROM product_sku_seq`);
      if (result?.[0]) {
        const nextVal = result[0].is_called
          ? Number(result[0].last_value) + 1
          : Number(result[0].last_value);
        return { sku: `SME${nextVal}` };
      }
    } catch {
      // Sequence might not be queried yet or uninitialized
    }
    const count = await this.prismaService.product.count();
    return { sku: `SME${10001 + count}` };
  }

  transformProductResponse(product: any, isAdmin = false) {
    if (!product) return null;

    const isVariable = product.productType === ProductType.variable;
    const rawVariations = Array.isArray(product.variations) ? (product.variations as any[]) : [];
    const rawAttributes = Array.isArray(product.attributes) ? (product.attributes as any[]) : [];

    const variationsToInclude = isAdmin
      ? rawVariations
      : rawVariations.filter((v: any) => v.isActive !== false);

    const formattedAttributes = rawAttributes.map((attr: any, idx: number) => ({
      id: attr.id ?? idx + 1,
      name: attr.name,
      slug: attr.slug || attr.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      options: Array.isArray(attr.options) ? attr.options : [],
      variation: attr.variation !== undefined ? attr.variation : true,
      visible: attr.visible !== undefined ? attr.visible : true,
    }));

    const formattedVariations = variationsToInclude.map((v: any) => {
      const regPrice = Number(v.regularPrice);
      const salePrice =
        v.salePrice !== undefined && v.salePrice !== null ? Number(v.salePrice) : null;
      const effectivePrice =
        salePrice !== null && salePrice < regPrice ? salePrice : regPrice;
      const stock = Number(v.stockQuantity) || 0;

      return {
        id: String(v.id),
        sku: v.sku,
        price: effectivePrice,
        regular_price: regPrice,
        sale_price: salePrice,
        stock_status: stock > 0 ? 'instock' : 'outofstock',
        stock_quantity: stock,
        weight: v.weight !== undefined && v.weight !== null ? String(v.weight) : null,
        image: this.resolveImageObject(v.image),
        attributes: Array.isArray(v.attributes)
          ? v.attributes.map((a: any) => ({
              name: a.name,
              option: a.option,
            }))
          : [],
        ...(isAdmin ? { isActive: v.isActive !== false } : {}),
      };
    });

    const result: any = {
      ...product,
      type: product.productType ?? (isVariable ? 'variable' : 'simple'),
      attributes: formattedAttributes,
      variationsData: formattedVariations,
    };

    if (!isAdmin) {
      delete result.variations;
      delete result.version;
    }

    return result;
  }

  private resolveImageObject(image: any): { src: string } {
    if (!image) return { src: '' };
    if (typeof image === 'object' && image.src) {
      return { src: this.formatImageUrl(image.src) };
    }
    if (typeof image === 'string') {
      return { src: this.formatImageUrl(image) };
    }
    return { src: '' };
  }

  private formatImageUrl(urlOrKey: string): string {
    if (!urlOrKey) return '';
    if (
      urlOrKey.startsWith('http://') ||
      urlOrKey.startsWith('https://') ||
      urlOrKey.startsWith('data:')
    ) {
      return urlOrKey;
    }
    const baseUrl = process.env.R2_PUBLIC_BASE_URL;
    if (baseUrl) {
      return `${baseUrl.replace(/\/+$/, '')}/${urlOrKey.replace(/^\/+/, '')}`;
    }
    return urlOrKey;
  }

  private validateVariableAttributesAndCombinations(attributes: any[], variations: any[]) {
    const allowedAttrs = new Map<string, Set<string>>();
    for (const attr of attributes || []) {
      if (!attr.name || !Array.isArray(attr.options) || attr.options.length === 0) {
        throw new BadRequestException(`Attribute "${attr.name || 'unnamed'}" must have options`);
      }
      allowedAttrs.set(
        attr.name.toLowerCase().trim(),
        new Set(attr.options.map((o: string) => String(o).toLowerCase().trim())),
      );
    }

    const combinationSet = new Set<string>();

    for (const v of variations) {
      const reg = Number(v.regularPrice);
      if (isNaN(reg) || reg <= 0) {
        throw new BadRequestException('Variation regular price must be greater than 0');
      }

      if (v.salePrice !== undefined && v.salePrice !== null) {
        const sale = Number(v.salePrice);
        if (isNaN(sale) || sale >= reg || sale <= 0) {
          throw new BadRequestException(
            'Variation sale price must be lower than regular price and greater than 0',
          );
        }
      }

      if (v.stockQuantity !== undefined && v.stockQuantity !== null) {
        const stock = Number(v.stockQuantity);
        if (isNaN(stock) || stock < 0) {
          throw new BadRequestException('Variation stock quantity must be 0 or more');
        }
      }

      if (!Array.isArray(v.attributes) || v.attributes.length === 0) {
        throw new BadRequestException('Each variation must have attributes');
      }

      for (const vAttr of v.attributes) {
        const optSet = allowedAttrs.get(vAttr.name.toLowerCase().trim());
        if (!optSet) {
          throw new BadRequestException(
            `Attribute "${vAttr.name}" in variation is not declared in product attributes`,
          );
        }
        if (!optSet.has(String(vAttr.option).toLowerCase().trim())) {
          throw new BadRequestException(
            `Option "${vAttr.option}" for attribute "${vAttr.name}" is not declared in product attribute options`,
          );
        }
      }

      const comboKey = [...v.attributes]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((a) => `${a.name.toLowerCase().trim()}:${a.option.toLowerCase().trim()}`)
        .join('|');

      if (combinationSet.has(comboKey)) {
        throw new BadRequestException('Duplicate variation attribute combinations are not allowed');
      }
      combinationSet.add(comboKey);
    }
  }

  private async assertVariationSkuUniqueness(
    tx: Prisma.TransactionClient,
    parentSku: string,
    variations: any[],
    currentProductId?: string,
  ) {
    const variantSkus = variations.map((v) => v.sku.toUpperCase());
    const seen = new Set<string>();
    for (const s of variantSkus) {
      if (seen.has(s)) {
        throw new ConflictException(`Duplicate variation SKU "${s}" within product`);
      }
      seen.add(s);
    }

    if (variantSkus.includes(parentSku.toUpperCase())) {
      throw new ConflictException(`Variation SKU cannot match parent SKU "${parentSku}"`);
    }

    // Check vs any Product.sku in database
    const productConflict = await tx.product.findFirst({
      where: {
        sku: { in: variantSkus },
        id: currentProductId ? { not: currentProductId } : undefined,
      },
      select: { sku: true },
    });
    if (productConflict) {
      throw new ConflictException(
        `Variation SKU "${productConflict.sku}" conflicts with an existing product SKU`,
      );
    }

    // Check vs any other product's variations using JSONB containment (backed by GIN index)
    for (const vSku of variantSkus) {
      const otherConflict = await tx.$queryRawUnsafe<{ id: string; sku: string }[]>(
        `SELECT id, sku FROM products WHERE ($1::uuid IS NULL OR id != $1::uuid) AND variations @> $2::jsonb LIMIT 1`,
        currentProductId || null,
        JSON.stringify([{ sku: vSku }]),
      );
      if (otherConflict && otherConflict.length > 0) {
        throw new ConflictException(
          `Variation SKU "${vSku}" is already used by another product (ID: ${otherConflict[0].id})`,
        );
      }
    }
  }
}
