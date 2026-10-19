import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus, ProductType } from '@prisma/client';
import { randomUUID } from 'crypto';

export interface CSVProductRow {
  handle: string;
  type: 'simple' | 'variable' | 'variation';
  sku?: string;
  parentSku?: string;
  title?: string;
  description?: string;
  category?: string;
  regularPrice?: string;
  salePrice?: string;
  stock?: string;
  weight?: string;
  length?: string;
  width?: string;
  height?: string;
  images?: string;
  attributes?: string; // Format: "Color: Red, Blue | Size: S, M" or for variation: "Color: Red | Size: S"
  status?: string;
}

export interface ImportSummary {
  totalRowsProcessed: number;
  createdParents: number;
  updatedParents: number;
  totalVariations: number;
  errors: Array<{ row: number; sku?: string; message: string }>;
}

@Injectable()
export class ProductsImportExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to generate next sequential parent SKU or variation SKU
   */
  async generateSku(parentSku?: string, variantIndex?: number): Promise<string> {
    if (parentSku && variantIndex !== undefined) {
      const suffix = String(variantIndex).padStart(2, '0');
      return `${parentSku}-${suffix}`;
    }

    try {
      const result = await this.prisma.$queryRawUnsafe<{ nextval: string | number | bigint }[]>(
        `SELECT nextval('product_sku_seq') AS nextval`,
      );
      if (result?.[0]?.nextval != null) {
        return `SME${result[0].nextval}`;
      }
    } catch {
      try {
        await this.prisma.$executeRawUnsafe(
          `CREATE SEQUENCE IF NOT EXISTS product_sku_seq START WITH 10001 INCREMENT BY 1;`,
        );
        const result = await this.prisma.$queryRawUnsafe<{ nextval: string | number | bigint }[]>(
          `SELECT nextval('product_sku_seq') AS nextval`,
        );
        if (result?.[0]?.nextval != null) {
          return `SME${result[0].nextval}`;
        }
      } catch (retryError) {
        console.error('Failed to generate sequence-based SKU in import:', retryError);
      }
    }

    const count = await this.prisma.product.count();
    return `SME${10001 + count}`;
  }

  /**
   * Generates a standard UTF-8 CSV string for all products and variations in the catalog.
   */
  async exportProductsToCsv(): Promise<string> {
    const products = await this.prisma.product.findMany({
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Handle',
      'Type',
      'SKU',
      'Parent SKU',
      'Title',
      'Description',
      'Category',
      'Regular Price',
      'Sale Price',
      'Stock',
      'Weight',
      'Length',
      'Width',
      'Height',
      'Images',
      'Attributes',
      'Status',
    ];

    const escapeCell = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines: string[] = [headers.join(',')];

    for (const prod of products) {
      const isVariable = prod.productType === ProductType.variable;
      const imagesStr = Array.isArray(prod.images) ? prod.images.join(',') : '';

      // Format parent attributes string (e.g. "Color: Red, Blue | Size: S, M")
      let attributesStr = '';
      if (Array.isArray(prod.attributes)) {
        attributesStr = (prod.attributes as any[])
          .map((attr) => `${attr.name}: ${(attr.options || []).join(', ')}`)
          .join(' | ');
      }

      // Write Parent Row
      lines.push(
        [
          escapeCell(prod.slug),
          escapeCell(prod.productType),
          escapeCell(prod.sku),
          '', // Parent SKU is empty for parents
          escapeCell(prod.title),
          escapeCell(prod.description),
          escapeCell(prod.category?.name || ''),
          escapeCell(prod.basePrice ? Number(prod.basePrice) : ''),
          escapeCell(prod.salePrice ? Number(prod.salePrice) : ''),
          escapeCell(prod.stockQuantity),
          escapeCell(prod.weight ? Number(prod.weight) : ''),
          escapeCell(prod.length ? Number(prod.length) : ''),
          escapeCell(prod.width ? Number(prod.width) : ''),
          escapeCell(prod.height ? Number(prod.height) : ''),
          escapeCell(imagesStr),
          escapeCell(attributesStr),
          escapeCell(prod.status),
        ].join(','),
      );

      // If variable, write each variation as a row
      if (isVariable && Array.isArray(prod.variations)) {
        for (const v of prod.variations as any[]) {
          // Format variation attribute values (e.g. "Color: Red | Size: S")
          const varAttrStr = (v.attributes || [])
            .map((a: any) => `${a.name}: ${a.option}`)
            .join(' | ');

          lines.push(
            [
              escapeCell(prod.slug),
              'variation',
              escapeCell(v.sku),
              escapeCell(prod.sku), // Parent SKU
              escapeCell(`${prod.title} - ${v.sku}`),
              '',
              '',
              escapeCell(v.regularPrice !== undefined ? Number(v.regularPrice) : ''),
              escapeCell(v.salePrice !== undefined && v.salePrice !== null ? Number(v.salePrice) : ''),
              escapeCell(v.stockQuantity ?? 0),
              escapeCell(v.weight !== undefined && v.weight !== null ? Number(v.weight) : ''),
              escapeCell(v.length !== undefined && v.length !== null ? Number(v.length) : ''),
              escapeCell(v.width !== undefined && v.width !== null ? Number(v.width) : ''),
              escapeCell(v.height !== undefined && v.height !== null ? Number(v.height) : ''),
              escapeCell(v.image || ''),
              escapeCell(varAttrStr),
              v.isActive !== false ? 'active' : 'draft',
            ].join(','),
          );
        }
      }
    }

    return lines.join('\r\n');
  }

  /**
   * Parses CSV string into structured objects, handling quoted multiline cells.
   */
  parseCsv(csvContent: string): CSVProductRow[] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    // Normalize newlines
    const sanitized = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < sanitized.length; i++) {
      const char = sanitized[i];
      const nextChar = sanitized[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n' && !insideQuotes) {
        currentRow.push(currentCell.trim());
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
    }

    if (rows.length < 2) return [];

    const headerMap = new Map<string, number>();
    rows[0].forEach((h, idx) => {
      const key = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      headerMap.set(key, idx);
    });

    const getCol = (row: string[], ...keys: string[]): string => {
      for (const k of keys) {
        const idx = headerMap.get(k.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (idx !== undefined && row[idx] !== undefined) {
          return row[idx].trim();
        }
      }
      return '';
    };

    const parsedData: CSVProductRow[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const rawSku = getCol(row, 'sku');
      const title = getCol(row, 'title', 'name');
      const handle = getCol(row, 'handle', 'slug');
      const typeRaw = getCol(row, 'type').toLowerCase();

      // Skip row only if it completely lacks sku, title, and handle
      if (!rawSku && !title && !handle) continue;

      let type: 'simple' | 'variable' | 'variation' = 'simple';
      if (typeRaw === 'variable') type = 'variable';
      else if (typeRaw === 'variation') type = 'variation';

      parsedData.push({
        handle,
        type,
        sku: rawSku ? rawSku.toUpperCase() : undefined,
        parentSku: getCol(row, 'parentsku', 'parent').toUpperCase() || undefined,
        title,
        description: getCol(row, 'description', 'desc'),
        category: getCol(row, 'category', 'categoryname'),
        regularPrice: getCol(row, 'regularprice', 'price', 'baseprice'),
        salePrice: getCol(row, 'saleprice'),
        stock: getCol(row, 'stock', 'stockquantity', 'inventory'),
        weight: getCol(row, 'weight', 'weightg', 'weightingrams'),
        length: getCol(row, 'length'),
        width: getCol(row, 'width'),
        height: getCol(row, 'height'),
        images: getCol(row, 'images', 'image'),
        attributes: getCol(row, 'attributes', 'attribute'),
        status: getCol(row, 'status').trim(),
      });
    }

    return parsedData;
  }

  /**
   * Validates and imports the CSV product records inside a database transaction.
   */
  async importProductsFromCsv(csvContent: string, updateExisting = true): Promise<ImportSummary> {
    const records = this.parseCsv(csvContent);
    if (records.length === 0) {
      throw new BadRequestException('No valid product rows found in CSV');
    }

    // Auto-generate SKUs and associate variations with parents
    const parentMap = new Map<string, CSVProductRow>();
    const variationsByParent = new Map<string, CSVProductRow[]>();
    const errors: Array<{ row: number; sku?: string; message: string }> = [];

    // Pre-pass: assign SKUs to parents that lack one, or match by handle/title
    const handleToParentSku = new Map<string, string>();

    for (let idx = 0; idx < records.length; idx++) {
      const rec = records[idx];
      const rowNum = idx + 2;

      if (rec.type !== 'variation') {
        const rawStatus = (rec.status ?? '').trim().toLowerCase();
        if (rawStatus && rawStatus !== 'active' && rawStatus !== 'draft' && rawStatus !== 'archived') {
          errors.push({ row: rowNum, sku: rec.sku, message: 'Invalid status' });
          continue;
        }

        let parentSku = rec.sku?.trim() ? rec.sku.trim().toUpperCase() : '';
        if (!parentSku) {
          parentSku = await this.generateSku();
          rec.sku = parentSku;
        }
        parentMap.set(parentSku, rec);
        if (rec.handle) {
          handleToParentSku.set(rec.handle.toLowerCase().trim(), parentSku);
        }
        if (rec.title) {
          handleToParentSku.set(rec.title.toLowerCase().trim(), parentSku);
        }
      }
    }

    // Now organize variations under their parent
    for (let idx = 0; idx < records.length; idx++) {
      const rec = records[idx];
      const rowNum = idx + 2;

      if (rec.type === 'variation') {
        let parentSku = rec.parentSku?.trim() ? rec.parentSku.trim().toUpperCase() : undefined;

        // Fallback: match parent by handle or title
        if (!parentSku && rec.handle && handleToParentSku.has(rec.handle.toLowerCase().trim())) {
          parentSku = handleToParentSku.get(rec.handle.toLowerCase().trim());
          rec.parentSku = parentSku;
        }
        if (!parentSku && rec.title && handleToParentSku.has(rec.title.toLowerCase().trim())) {
          parentSku = handleToParentSku.get(rec.title.toLowerCase().trim());
          rec.parentSku = parentSku;
        }

        if (!parentSku) {
          errors.push({ row: rowNum, sku: rec.sku, message: 'Variation row is missing Parent SKU and could not be linked to parent' });
          continue;
        }

        const existing = variationsByParent.get(parentSku) || [];
        existing.push(rec);
        variationsByParent.set(parentSku, existing);
      }
    }

    let createdParents = 0;
    let updatedParents = 0;
    let totalVariationsCount = 0;

    await this.prisma.$transaction(async (tx) => {
      // Fetch or cache categories
      const allCategories = await tx.category.findMany();
      const categoryLookup = new Map<string, string>();
      allCategories.forEach((c) => {
        categoryLookup.set(c.name.toLowerCase().trim(), c.id);
        categoryLookup.set(c.slug.toLowerCase().trim(), c.id);
      });

      // Default fallback category if none exists
      let defaultCategoryId = allCategories[0]?.id;
      if (!defaultCategoryId) {
        const createdCat = await tx.category.create({
          data: {
            name: 'General',
            slug: 'general',
          },
        });
        defaultCategoryId = createdCat.id;
        categoryLookup.set('general', defaultCategoryId);
      }

      // Process Parent Products
      for (const [parentSku, pRow] of parentMap.entries()) {
        const existing = await tx.product.findUnique({
          where: { sku: parentSku },
        });

        if (existing && !updateExisting) {
          continue;
        }

        // Resolve category
        let categoryId = defaultCategoryId;
        if (pRow.category && categoryLookup.has(pRow.category.toLowerCase().trim())) {
          categoryId = categoryLookup.get(pRow.category.toLowerCase().trim())!;
        } else if (pRow.category) {
          // Auto-create category
          const catSlug = pRow.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const newCat = await tx.category.create({
            data: {
              name: pRow.category,
              slug: `${catSlug}-${randomUUID().slice(0, 4)}`,
            },
          });
          categoryId = newCat.id;
          categoryLookup.set(pRow.category.toLowerCase().trim(), categoryId);
        }

        const variationsForThisParent = variationsByParent.get(parentSku) || [];
        const isVariable = pRow.type === 'variable' || variationsForThisParent.length > 0;

        // Parse attributes and variations
        let attributesJson: any[] = [];
        let variationsJson: any[] = [];
        let basePrice = Number(pRow.regularPrice || 0);
        let salePrice = pRow.salePrice ? Number(pRow.salePrice) : null;
        let stockQuantity = Number(pRow.stock || 0);

        const parentWeight = pRow.weight ? Number(pRow.weight) : existing?.weight ? Number(existing.weight) : null;
        const parentLength = pRow.length ? Number(pRow.length) : existing?.length ? Number(existing.length) : null;
        const parentWidth = pRow.width ? Number(pRow.width) : existing?.width ? Number(existing.width) : null;
        const parentHeight = pRow.height ? Number(pRow.height) : existing?.height ? Number(existing.height) : null;

        if (isVariable) {
          // Aggregate variation attributes
          const attrMap = new Map<string, Set<string>>();
          let varIndex = 1;

          variationsJson = variationsForThisParent.map((vRow) => {
            const varAttrs: Array<{ name: string; option: string }> = [];
            if (vRow.attributes) {
              const pairs = vRow.attributes.split('|').map((s) => s.trim());
              pairs.forEach((pair) => {
                const [attrName, attrVal] = pair.split(':').map((s) => s.trim());
                if (attrName && attrVal) {
                  varAttrs.push({ name: attrName, option: attrVal });
                  if (!attrMap.has(attrName)) attrMap.set(attrName, new Set());
                  attrMap.get(attrName)!.add(attrVal);
                }
              });
            }

            const regPrice = Number(vRow.regularPrice || pRow.regularPrice || 0);
            const sPrice = vRow.salePrice ? Number(vRow.salePrice) : null;
            const vStock = Number(vRow.stock || 0);

            // Auto-generate variation SKU if missing
            const variantSku = vRow.sku?.trim()
              ? vRow.sku.trim().toUpperCase()
              : `${parentSku}-${String(varIndex).padStart(2, '0')}`;
            varIndex++;

            const vWeight = vRow.weight !== undefined && vRow.weight !== '' ? Number(vRow.weight) : parentWeight;
            const vLength = vRow.length !== undefined && vRow.length !== '' ? Number(vRow.length) : parentLength;
            const vWidth = vRow.width !== undefined && vRow.width !== '' ? Number(vRow.width) : parentWidth;
            const vHeight = vRow.height !== undefined && vRow.height !== '' ? Number(vRow.height) : parentHeight;
            const existingVariations = Array.isArray(existing?.variations)
              ? (existing.variations as Array<{ id?: string; sku?: string }>)
              : [];
            const matchedVariation = existingVariations.find(
              (v) => (v.sku ?? '').trim().toUpperCase() === variantSku,
            );

            return {
              id: matchedVariation?.id || randomUUID(),
              sku: variantSku,
              regularPrice: regPrice,
              salePrice: sPrice,
              stockQuantity: vStock,
              weight: vWeight,
              length: vLength,
              width: vWidth,
              height: vHeight,
              image: vRow.images ? vRow.images.split(',')[0].trim() : null,
              attributes: varAttrs,
              isActive: vRow.status !== 'draft',
            };
          });

          // Build attributes list
          attributesJson = Array.from(attrMap.entries()).map(([name, optionsSet]) => ({
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            options: Array.from(optionsSet),
            variation: true,
            visible: true,
          }));

          // Server-side compute: basePrice = min effective price, stock = sum
          if (variationsJson.length > 0) {
            const activeVars = variationsJson.filter((v) => v.isActive);
            const candidates = (activeVars.length > 0 ? activeVars : variationsJson).map((v) =>
              v.salePrice !== null && v.salePrice < v.regularPrice ? v.salePrice : v.regularPrice,
            );
            basePrice = candidates.length > 0 ? Math.min(...candidates) : basePrice;
            stockQuantity = (activeVars.length > 0 ? activeVars : variationsJson).reduce(
              (sum, v) => sum + (v.stockQuantity || 0),
              0,
            );
          }

          totalVariationsCount += variationsJson.length;
        }

        const images = pRow.images
          ? pRow.images.split(',').map((s) => s.trim()).filter(Boolean)
          : existing?.images || [];

        const slug =
          pRow.handle ||
          (pRow.title ? pRow.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : null) ||
          parentSku.toLowerCase();

        const rawStatus = (pRow.status ?? '').trim().toLowerCase();
        let status: ProductStatus;
        if (rawStatus === 'draft') {
          status = ProductStatus.draft;
        } else if (rawStatus === 'archived') {
          status = ProductStatus.archived;
        } else if (rawStatus === 'active') {
          status = ProductStatus.active;
        } else {
          status = existing ? existing.status : ProductStatus.active;
        }

        if (existing) {
          await tx.product.update({
            where: { id: existing.id },
            data: {
              title: pRow.title || existing.title,
              description: pRow.description !== undefined ? pRow.description : existing.description,
              basePrice,
              salePrice,
              stockQuantity,
              weight: parentWeight,
              length: parentLength,
              width: parentWidth,
              height: parentHeight,
              images,
              status,
              categoryId,
              productType: isVariable ? ProductType.variable : ProductType.simple,
              attributes: isVariable ? attributesJson : (existing.attributes ?? undefined),
              variations: isVariable ? variationsJson : (existing.variations ?? undefined),
              version: { increment: 1 },
            },
          });
          updatedParents++;
        } else {
          // Check slug uniqueness
          let uniqueSlug = slug;
          const slugExists = await tx.product.findUnique({ where: { slug: uniqueSlug } });
          if (slugExists) {
            uniqueSlug = `${slug}-${randomUUID().slice(0, 6)}`;
          }

          await tx.product.create({
            data: {
              sku: parentSku,
              title: pRow.title || parentSku,
              slug: uniqueSlug,
              description: pRow.description || '',
              shortDescription: '',
              basePrice,
              salePrice,
              stockQuantity,
              weight: parentWeight,
              length: parentLength,
              width: parentWidth,
              height: parentHeight,
              images,
              status,
              categoryId,
              customFields: {},
              productType: isVariable ? ProductType.variable : ProductType.simple,
              attributes: isVariable ? attributesJson : undefined,
              variations: isVariable ? variationsJson : undefined,
              version: 1,
            },
          });
          createdParents++;
        }
      }
    });

    return {
      totalRowsProcessed: records.length,
      createdParents,
      updatedParents,
      totalVariations: totalVariationsCount,
      errors,
    };
  }
}
