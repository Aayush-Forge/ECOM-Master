import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

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

async function verify() {
  const csvPath = path.join(__dirname, 'wc-product-export.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvContent);
  const header = rows[0];

  const typeIdx = header.indexOf('Type');
  const skuIdx = header.indexOf('SKU');
  const nameIdx = header.indexOf('Name');
  const regPriceIdx = header.indexOf('Regular price');
  const salePriceIdx = header.indexOf('Sale price');

  const csvSimple = rows.slice(1).filter((r) => r[typeIdx] === 'simple');

  const dbProducts = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' },
    include: { category: true },
  });

  console.log(`\n========================================================================================================================`);
  console.log(`DIRECT FILE-VS-DATABASE COMPARISON (ALL 13 PRODUCTS, RE-READ FROM SOURCE CSV)`);
  console.log(`========================================================================================================================\n`);

  csvSimple.forEach((csvRow, i) => {
    const csvSku = csvRow[skuIdx];
    const csvName = csvRow[nameIdx];
    const csvRegPrice = parseFloat(csvRow[regPriceIdx]);
    const csvSalePrice = csvRow[salePriceIdx] && csvRow[salePriceIdx].trim() ? parseFloat(csvRow[salePriceIdx]) : null;

    const dbProd = dbProducts.find((p) => p.sku === csvSku);

    console.log(`[Item ${i + 1}] SKU: ${csvSku}`);
    console.log(`  CSV Title:        "${csvName}"`);
    console.log(`  DB Title:         "${dbProd?.title}"`);
    console.log(`  Title Match?:     ${csvName === dbProd?.title}`);
    console.log(`  CSV RegularPrice: ₹${csvRegPrice}  |  DB BasePrice: ₹${Number(dbProd?.basePrice)}  |  Match: ${csvRegPrice === Number(dbProd?.basePrice)}`);
    console.log(`  CSV SalePrice:    ${csvSalePrice ? '₹' + csvSalePrice : 'null'}  |  DB SalePrice: ${dbProd?.salePrice ? '₹' + Number(dbProd.salePrice) : 'null'}  |  Match: ${(csvSalePrice ?? null) === (dbProd?.salePrice ? Number(dbProd.salePrice) : null)}`);
    console.log(`  Category:         "${dbProd?.category.name}"`);
    console.log(`------------------------------------------------------------------------------------------------------------------------`);
  });

  const dhcNan36 = await prisma.product.findUnique({
    where: { sku: 'DHC-NAN-36' },
  });
  console.log(`\nVariable Product 'DHC-NAN-36' in DB?: ${dhcNan36 ? 'FOUND (ERROR)' : 'ABSENT (CORRECT)'}`);

  const fakeSkus = [
    'AGB-JAS-100', 'AGB-KES-100', 'AGB-ROU-100', 'AGB-MYS-100',
    'DHP-BHR-100', 'DHP-GUG-100', 'DHP-SAN-100', 'DHP-LOB-100',
    'SAM-CUP-12P', 'SAM-DAN-KIT', 'RIT-HAW-KIT', 'DHC-GUG-30P',
  ];
  const lingeringFake = await prisma.product.findMany({
    where: { sku: { in: fakeSkus } },
  });
  console.log(`Lingering fake SKUs in DB count: ${lingeringFake.length} (Expected: 0)`);
}

verify()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
