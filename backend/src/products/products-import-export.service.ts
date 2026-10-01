import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus, ProductType } from '@prisma/client';
import { randomUUID } from 'crypto';

export interface CSVProductRow {
  handle: string;
  type: 'simple' | 'variable' | 'variation';
  sku: string;
  parentSku?: string;
  title?: string;
  description?: string;
  category?: string;
  regularPrice?: string;
  salePrice?: string;
  stock?: string;
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
      const sku = getCol(row, 'sku');
      if (!sku) continue;

      const typeRaw = getCol(row, 'type').toLowerCase();
      let type: 'simple' | 'variable' | 'variation' = 'simple';
      if (typeRaw === 'variable') type = 'variable';
      else if (typeRaw === 'variation') type = 'variation';

      parsedData.push({
        handle: getCol(row, 'handle', 'slug'),
        type,
        sku: sku.toUpperCase(),
        parentSku: getCol(row, 'parentsku', 'parent').toUpperCase() || undefined,
        title: getCol(row, 'title', 'name'),
        description: getCol(row, 'description', 'desc'),
        category: getCol(row, 'category', 'categoryname'),
        regularPrice: getCol(row, 'regularprice', 'price', 'baseprice'),
        salePrice: getCol(row, 'saleprice'),
        stock: getCol(row, 'stock', 'stockquantity', 'inventory'),
        images: getCol(row, 'images', 'image'),
        attributes: getCol(row, 'attributes', 'attribute'),
        status: getCol(row, 'status') || 'active',
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

    // Separate parents and variations
    const parentMap = new Map<string, CSVProductRow>();
    const variationsByParent = new Map<string, CSVProductRow[]>();
    const errors: Array<{ row: number; sku?: string; message: string }> = [];

    records.forEach((rec, idx) => {
      const rowNum = idx + 2; // Accounting for 1-based index and header
      if (rec.type === 'variation') {
        if (!rec.parentSku) {
          errors.push({ row: rowNum, sku: rec.sku, message: 'Variation row is missing Parent SKU' });
          return;
        }
        const existing = variationsByParent.get(rec.parentSku) || [];
        existing.push(rec);
        variationsByParent.set(rec.parentSku, existing);
      } else {
        parentMap.set(rec.sku, rec);
      }
    });

    // Ensure all variations have parent definitions (either in CSV or DB)
    for (const parentSku of variationsByParent.keys()) {
      if (!parentMap.has(parentSku)) {
        // Will check in DB during transaction
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

      // 1. Process Parent Products
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

        if (isVariable) {
          // Aggregate variation attributes
          const attrMap = new Map<string, Set<string>>();

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

            return {
              id: randomUUID(),
              sku: vRow.sku,
              regularPrice: regPrice,
              salePrice: sPrice,
              stockQuantity: vStock,
              weight: null,
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

        const status = pRow.status === 'draft' ? ProductStatus.draft : ProductStatus.active;

        if (existing) {
          await tx.product.update({
            where: { id: existing.id },
            data: {
              title: pRow.title || existing.title,
              description: pRow.description !== undefined ? pRow.description : existing.description,
              basePrice,
              salePrice,
              stockQuantity,
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
