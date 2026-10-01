import { PrismaClient, ProductType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://sridattam_admin:sridattam_secure_pass_2026@localhost:5432/sridattam_dev_db?schema=public';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export interface DBVariation {
  id: string;
  sku: string;
  regularPrice: number;
  salePrice: number | null;
  stockQuantity: number;
  weight: number | null;
  image: string | null;
  attributes: Array<{ name: string; option: string }>;
  isActive: boolean;
}

export interface DBAttribute {
  id?: number | string;
  name: string;
  slug?: string;
  options: string[];
  variation?: boolean;
  visible?: boolean;
}

export async function migrateProductVariations() {
  console.log('--- STARTING IDEMPOTENT PRODUCT VARIATIONS DATA MIGRATION ---');

  const products = await prisma.product.findMany();
  let migratedCount = 0;
  const summary: Array<{ id: string; sku: string; title: string; variations: Array<{ id: string; sku: string }> }> = [];

  for (const product of products) {
    const cf = (product.customFields && typeof product.customFields === 'object' ? product.customFields : {}) as Record<string, any>;
    const hasLegacyAttributes = Array.isArray(cf.attributes) && cf.attributes.length > 0;
    const hasLegacyVariations = Array.isArray(cf.variationsData) && cf.variationsData.length > 0;

    // Check if migration is needed or already migrated
    if (!hasLegacyAttributes && !hasLegacyVariations) {
      if (product.productType === ProductType.variable && Array.isArray(product.variations) && (product.variations as any[]).length > 0) {
        summary.push({
          id: product.id,
          sku: product.sku,
          title: product.title,
          variations: (product.variations as unknown as DBVariation[]).map((v) => ({ id: v.id, sku: v.sku })),
        });
      }
      continue;
    }

    // 1. Convert attributes
    const rawAttrs: any[] = hasLegacyAttributes ? cf.attributes : [];
    const cleanAttrs: DBAttribute[] = rawAttrs.map((a, idx) => ({
      id: a.id ?? idx + 1,
      name: String(a.name || '').trim(),
      slug: a.slug || String(a.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      options: Array.isArray(a.options)
        ? a.options.map((o: any) => String(o).trim()).filter(Boolean)
        : (a.values || '')
            .split(',')
            .map((v: string) => v.trim())
            .filter(Boolean),
      variation: a.variation !== false,
      visible: a.visible !== false,
    }));

    // 2. Convert and validate variations against VariationDto rules
    const rawVars: any[] = hasLegacyVariations ? cf.variationsData : [];
    const cleanVars: DBVariation[] = [];

    for (let idx = 0; idx < rawVars.length; idx++) {
      const v = rawVars[idx];
      const regPrice = Number(v.regularPrice || v.regular_price || v.price || product.basePrice || 0);
      const rawSale = v.salePrice ?? v.sale_price;
      const salePrice = rawSale !== undefined && rawSale !== null && rawSale !== '' && Number(rawSale) > 0 && Number(rawSale) < regPrice
        ? Number(rawSale)
        : null;
      const stock = Number(v.stockQuantity ?? v.stock_quantity ?? 50);

      const attrs: Array<{ name: string; option: string }> = Array.isArray(v.attributes)
        ? v.attributes.map((a: any) => ({
            name: String(a.name || '').trim(),
            option: String(a.option || a.value || '').trim(),
          })).filter((a: any) => a.name && a.option)
        : [];

      // Validate against VariationDto rules
      const invalidReasons: string[] = [];
      if (regPrice <= 0) invalidReasons.push(`regularPrice must be > 0 (got ${regPrice})`);
      if (rawSale !== undefined && rawSale !== null && rawSale !== '' && Number(rawSale) >= regPrice) {
        invalidReasons.push(`salePrice (${rawSale}) must be < regularPrice (${regPrice})`);
      }
      if (stock < 0) invalidReasons.push(`stockQuantity cannot be negative (got ${stock})`);
      if (attrs.length === 0) invalidReasons.push('attributes array cannot be empty');

      if (invalidReasons.length > 0) {
        console.warn(`[SKIP VARIATION] Product ${product.sku} variation #${idx + 1} (${v.sku || 'no-sku'}) skipped: ${invalidReasons.join(', ')}`);
        continue;
      }

      let imageStr: string | null = null;
      if (typeof v.image === 'string') {
        imageStr = v.image;
      } else if (v.image && typeof v.image === 'object' && v.image.src) {
        imageStr = String(v.image.src);
      }

      cleanVars.push({
        id: String(v.id || randomUUID()),
        sku: String(v.sku || `${product.sku}-${idx + 1}`),
        regularPrice: regPrice,
        salePrice,
        stockQuantity: stock,
        weight: v.weight ? Number(v.weight) : null,
        image: imageStr,
        attributes: attrs,
        isActive: v.isActive !== false,
      });
    }

    if (cleanVars.length === 0) {
      console.warn(`[SKIP PRODUCT] Product ${product.sku} ("${product.title}") has 0 valid variations meeting VariationDto rules. Skipping variation migration for this product.`);
      continue;
    }

    // 3. Clean customFields by removing attributes and variationsData (and type if present)
    const newCustomFields = { ...cf };
    delete newCustomFields.attributes;
    delete newCustomFields.variationsData;
    if (newCustomFields.type === 'variable') {
      delete newCustomFields.type;
    }

    // 4. Calculate parent basePrice and stockQuantity
    const activeVars = cleanVars.filter((v) => v.isActive);
    const minPrice = activeVars.length > 0
      ? Math.min(...activeVars.map((v) => (v.salePrice !== null && v.salePrice < v.regularPrice ? v.salePrice : v.regularPrice)))
      : Number(product.basePrice);
    const totalStock = activeVars.length > 0
      ? activeVars.reduce((sum, v) => sum + (v.stockQuantity || 0), 0)
      : product.stockQuantity;

    // 5. Update database record
    await prisma.product.update({
      where: { id: product.id },
      data: {
        productType: ProductType.variable,
        attributes: cleanAttrs as any,
        variations: cleanVars as any,
        customFields: newCustomFields,
        basePrice: minPrice,
        stockQuantity: totalStock,
        version: { increment: 1 },
      },
    });

    migratedCount++;
    summary.push({
      id: product.id,
      sku: product.sku,
      title: product.title,
      variations: cleanVars.map((v) => ({ id: v.id, sku: v.sku })),
    });
  }

  console.log(`\n=== MIGRATION SUMMARY: ${migratedCount} PRODUCT(S) MIGRATED ===`);
  for (const s of summary) {
    console.log(`\nProduct [${s.sku}] "${s.title}":`);
    for (const v of s.variations) {
      console.log(`  - Variation ID: ${v.id} | SKU: ${v.sku}`);
    }
  }
  console.log('=================================================================\n');

  await pool.end();
}

if (require.main === module) {
  migrateProductVariations()
    .then(() => {
      console.log('Product variations migration finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
