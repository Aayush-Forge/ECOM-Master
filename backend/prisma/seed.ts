import { PrismaClient, UserRole, ProductStatus, OrderStatus, OrderAddressType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://sridattam_admin:sridattam_secure_pass_2026@localhost:5432/sridattam_dev_db?schema=public';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      if (currentRow.length > 1 || currentRow[0] !== '') {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-');
}

async function main() {
  // -------------------------------------------------------------
  // 1. Seed Users
  // -------------------------------------------------------------
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    {
      email: 'admin@sridattam.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.admin,
      isActive: true,
    },
    {
      email: 'editor@sridattam.com',
      firstName: 'Editor',
      lastName: 'User',
      role: UserRole.editor,
      isActive: true,
    },
    {
      email: 'read_only@sridattam.com',
      firstName: 'Viewer',
      lastName: 'User',
      role: UserRole.read_only,
      isActive: true,
    },
    {
      email: 'customer@sridattam.com',
      firstName: 'Customer',
      lastName: 'User',
      role: UserRole.customer,
      isActive: true,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        passwordHash,
        isActive: user.isActive,
      },
      create: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        passwordHash,
        isActive: user.isActive,
      },
    });
  }

  // -------------------------------------------------------------
  // 2. Categories Seeding (reusing existing rows if present)
  // -------------------------------------------------------------
  const categoriesData = [
    { name: 'Incense Sticks', slug: 'incense-sticks' },
    { name: 'Dhoop Sticks', slug: 'dhoop-sticks' },
    { name: 'Dhoop Cones', slug: 'dhoop-cones' },
    { name: 'Sambrani Kits', slug: 'sambrani-kits' },
    { name: 'Ritual Kit', slug: 'ritual-kit' },
  ];

  const categoryMap = new Map<string, string>();

  for (const cat of categoriesData) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: { name: cat.name, slug: cat.slug },
    });
    categoryMap.set(cat.name, record.id);
  }

  // -------------------------------------------------------------
  // 3. Read & Parse Real CSV Export
  // -------------------------------------------------------------
  const csvPath = path.join(__dirname, 'wc-product-export.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvContent);
  const header = rows[0];

  const typeIdx = header.indexOf('Type');
  const skuIdx = header.indexOf('SKU');
  const nameIdx = header.indexOf('Name');
  const regularPriceIdx = header.indexOf('Regular price');
  const salePriceIdx = header.indexOf('Sale price');
  const catIdx = header.indexOf('Categories');
  const weightIdx = header.indexOf('Weight (g)');
  const shortDescIdx = header.indexOf('Short description');
  const descIdx = header.indexOf('Description');
  const stockIdx = header.indexOf('Stock');
  const tagsIdx = header.indexOf('Tags');
  const aromaIdx = header.indexOf('Attribute 1 value(s)');

  const simpleRows = rows.slice(1).filter((r) => r[typeIdx] === 'simple');

  console.log('\n=== REAL CSV SIMPLE PRODUCTS (VERBATIM FROM FILE) ===');
  simpleRows.forEach((r, idx) => {
    console.log(`${idx + 1}. SKU: ${r[skuIdx]} | Name: ${r[nameIdx]}`);
  });
  console.log('=====================================================\n');

  // -------------------------------------------------------------
  // 4. Delete Previously Seeded Fake Products & Dependent Relations
  // -------------------------------------------------------------
  console.log('Cleaning up previous test orders, cart items, and fake products...');
  await prisma.orderItem.deleteMany({});
  await prisma.orderStatusHistory.deleteMany({});
  await prisma.orderAddress.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.clubbingRuleProduct.deleteMany({});
  const deleteResult = await prisma.product.deleteMany({});
  console.log(`Deleted ${deleteResult.count} previous products from the database.`);

  // -------------------------------------------------------------
  // 5. Seed the 13 Real Products Directly from CSV Rows
  // -------------------------------------------------------------
  for (const r of simpleRows) {
    const sku = r[skuIdx];
    const title = r[nameIdx];
    const slug = slugify(title);
    const shortDescription = stripHtml(r[shortDescIdx] || '');
    const description = r[descIdx] || '';
    const basePrice = parseFloat(r[regularPriceIdx]);
    const salePrice =
      r[salePriceIdx] && r[salePriceIdx].trim() ? parseFloat(r[salePriceIdx]) : null;
    const weight =
      r[weightIdx] && r[weightIdx].trim() ? parseFloat(r[weightIdx]) / 1000 : null;
    const categoryName = r[catIdx];
    const categoryId = categoryMap.get(categoryName);

    if (!categoryId) {
      throw new Error(`Category not found for product ${sku}: "${categoryName}"`);
    }

    const stockQuantity =
      r[stockIdx] && r[stockIdx].trim() ? parseInt(r[stockIdx], 10) : 50;
    const tags = r[tagsIdx]
      ? r[tagsIdx]
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    const aromaFamily = r[aromaIdx] || '';

    await prisma.product.create({
      data: {
        sku,
        title,
        slug,
        shortDescription,
        description,
        basePrice,
        salePrice,
        weight,
        categoryId,
        stockQuantity,
        status: ProductStatus.active,
        customFields: {
          aromaFamily,
          tags,
        },
        images: (() => {
          const r2BaseUrl = process.env.R2_PUBLIC_BASE_URL || 'https://pub-78b25314ac78421fb5abe572bdbf3407.r2.dev';
          const r2Map: Record<string, string> = {
            'AGB-CHA-100': `${r2BaseUrl}/products/AGB-CHA-100.png`,
            'AGB-KAL-100': `${r2BaseUrl}/products/AGB-KAL-100.png`,
            'AGB-NAN-100': `${r2BaseUrl}/products/AGB-NAN-100.png`,
            'AGB-RAJ-100': `${r2BaseUrl}/products/AGB-RAJ-100.png`,
            'DHC-KAL-36': `${r2BaseUrl}/products/DHC-KAL-36.png`,
            'DHC-RAJ-36': `${r2BaseUrl}/products/DHC-RAJ-36.png`,
            'DHC-TRI-36': `${r2BaseUrl}/products/DHC-TRI-36.png`,
            'DHS-KAL-20': `${r2BaseUrl}/products/DHS-KAL-20.png`,
            'DHS-NAN-20': `${r2BaseUrl}/products/DHS-NAN-20.png`,
            'DHS-RAJ-20': `${r2BaseUrl}/products/DHS-RAJ-20.png`,
            'DHS-TRI-21': `${r2BaseUrl}/products/DHS-TRI-21.jpg`,
            'HAM-SAN-01': `${r2BaseUrl}/products/HAM-SAN-01.png`,
            'SMB-SAN-09': `${r2BaseUrl}/products/SMB-SAN-09.png`,
          };
          return r2Map[sku] ? [r2Map[sku]] : [];
        })(),
      },
    });
  }

  console.log(
    `[Seed Notice] Skipped variable product SKU 'DHC-NAN-36' (Lobhan Earthy Resin Dhoop Cones) and 12 child variations pending variant data model design.`,
  );
  console.log(`Successfully seeded ${simpleRows.length} real products from CSV.`);

  // -------------------------------------------------------------
  // 6. Seed Test Orders (ORD-TEST-001 paid, ORD-TEST-002 payment_pending)
  // -------------------------------------------------------------
  const customerUser = await prisma.user.findUnique({
    where: { email: 'customer@sridattam.com' },
  });

  const firstProduct = await prisma.product.findFirst();

  if (customerUser && firstProduct) {
    const paidOrder = await prisma.order.upsert({
      where: { orderNumber: 'ORD-TEST-001' },
      update: {
        customerId: customerUser.id,
        status: OrderStatus.paid,
        subtotal: 210.0,
        discountTotal: 0.0,
        taxTotal: 0.0,
        shippingTotal: 50.0,
        grandTotal: 260.0,
        currency: 'INR',
      },
      create: {
        orderNumber: 'ORD-TEST-001',
        customerId: customerUser.id,
        status: OrderStatus.paid,
        subtotal: 210.0,
        discountTotal: 0.0,
        taxTotal: 0.0,
        shippingTotal: 50.0,
        grandTotal: 260.0,
        currency: 'INR',
        items: {
          create: [
            {
              productId: firstProduct.id,
              titleSnapshot: firstProduct.title,
              skuSnapshot: firstProduct.sku,
              unitPriceSnapshot: 210.0,
              quantity: 1,
              lineTotal: 210.0,
            },
          ],
        },
        addresses: {
          create: [
            {
              type: OrderAddressType.shipping,
              fullName: 'Customer Test',
              phone: '9876543210',
              addressLine1: '123 Temple Road',
              city: 'Varanasi',
              state: 'Uttar Pradesh',
              postalCode: '221001',
              country: 'India',
            },
          ],
        },
        statusHistory: {
          create: [
            {
              toStatus: OrderStatus.paid,
              changedBySystem: 'Seeder',
              note: 'Order paid successfully',
            },
          ],
        },
      },
    });
    console.log(
      `Successfully seeded test order: ${paidOrder.orderNumber} (ID: ${paidOrder.id}) with status ${paidOrder.status} and grandTotal ${paidOrder.grandTotal}`,
    );

    const testOrder = await prisma.order.upsert({
      where: { orderNumber: 'ORD-TEST-002' },
      update: {
        customerId: customerUser.id,
        status: OrderStatus.payment_pending,
        subtotal: 210.0,
        discountTotal: 0.0,
        taxTotal: 0.0,
        shippingTotal: 50.0,
        grandTotal: 260.0,
        currency: 'INR',
      },
      create: {
        orderNumber: 'ORD-TEST-002',
        customerId: customerUser.id,
        status: OrderStatus.payment_pending,
        subtotal: 210.0,
        discountTotal: 0.0,
        taxTotal: 0.0,
        shippingTotal: 50.0,
        grandTotal: 260.0,
        currency: 'INR',
        items: {
          create: [
            {
              productId: firstProduct.id,
              titleSnapshot: firstProduct.title,
              skuSnapshot: firstProduct.sku,
              unitPriceSnapshot: 210.0,
              quantity: 1,
              lineTotal: 210.0,
            },
          ],
        },
        addresses: {
          create: [
            {
              type: OrderAddressType.shipping,
              fullName: 'Customer Test',
              phone: '9876543210',
              addressLine1: '123 Temple Road',
              city: 'Varanasi',
              state: 'Uttar Pradesh',
              postalCode: '221001',
              country: 'India',
            },
          ],
        },
        statusHistory: {
          create: [
            {
              toStatus: OrderStatus.payment_pending,
              changedBySystem: 'Seeder',
              note: 'Order placed awaiting checkout payment',
            },
          ],
        },
      },
    });
    console.log(
      `Successfully seeded test order: ${testOrder.orderNumber} (ID: ${testOrder.id}) with status ${testOrder.status} and grandTotal ${testOrder.grandTotal}`,
    );
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
