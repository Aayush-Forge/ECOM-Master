import { PrismaClient, ProductStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://sridattam_admin:sridattam_secure_pass_2026@localhost:5432/sridattam_dev_db?schema=public';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedLobhanVariableProduct() {
  console.log('Seeding Lobhan Earthy Resin Dhoop Cones variable product...');

  const category = await prisma.category.findFirst({
    where: { slug: 'dhoop-cones' },
  });

  if (!category) {
    throw new Error('Category dhoop-cones not found');
  }

  const sku = 'DHC-NAN-36';
  const title = 'Lobhan Earthy Resin Dhoop Cones | Easy-Light Temple Cones - Pack of 36';
  const slug = 'lobhan-earthy-resin-dhoop-cones-easy-light-temple-cones-pack-of-36';

  const attributes = [
    {
      id: 1,
      name: 'Color',
      slug: 'color',
      options: ['red', 'green', 'rosd'],
      variation: true,
      visible: true,
    },
    {
      id: 2,
      name: 'Size',
      slug: 'size',
      options: ['L', 'M', 'N'],
      variation: true,
      visible: true,
    },
  ];

  const colors = ['red', 'green', 'rosd'];
  const sizes = [
    { size: 'L', price: 179, regularPrice: 199 },
    { size: 'M', price: 159, regularPrice: 179 },
    { size: 'N', price: 139, regularPrice: 159 },
  ];

  const variationsData: any[] = [];
  let varIdx = 1;

  for (const color of colors) {
    for (const { size, price, regularPrice } of sizes) {
      variationsData.push({
        id: `var_${varIdx}`,
        sku: `${sku}-${color.toUpperCase().slice(0, 3)}-${size}`,
        price: String(price),
        regular_price: String(regularPrice),
        sale_price: String(price),
        on_sale: price < regularPrice,
        stock_status: 'instock',
        stock_quantity: 50,
        attributes: [
          { name: 'Color', option: color },
          { name: 'Size', option: size },
        ],
        image: {
          src: 'https://pub-78b25314ac78421fb5abe572bdbf3407.r2.dev/products/DHC-NAN-36.png',
        },
      });
      varIdx++;
    }
  }

  const dbVariations = variationsData.map((v) => ({
    id: v.id,
    sku: v.sku,
    regularPrice: Number(v.regular_price),
    salePrice: Number(v.sale_price),
    stockQuantity: Number(v.stock_quantity),
    weight: null,
    image: v.image?.src || null,
    attributes: v.attributes,
    isActive: true,
  }));

  const customFields = {
    aromaFamily: 'Deep Earthy-Resin',
    tags: ['dhoop cones', 'lobhan', 'temple', 'easy-light'],
  };

  const images = [
    'https://pub-78b25314ac78421fb5abe572bdbf3407.r2.dev/products/DHC-NAN-36.png',
    'https://pub-78b25314ac78421fb5abe572bdbf3407.r2.dev/products/DHC-KAL-36.png',
  ];

  const existing = await prisma.product.findUnique({
    where: { sku },
  });

  if (existing) {
    console.log(`Updating existing product ${sku}...`);
    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: {
        title,
        slug,
        basePrice: 139,
        salePrice: 139,
        stockQuantity: 450,
        status: ProductStatus.active,
        images,
        productType: 'variable' as any,
        attributes: attributes as any,
        variations: dbVariations as any,
        customFields: customFields as any,
      },
    });
    console.log(`Updated product: ${updated.id} (${updated.title})`);
  } else {
    console.log(`Creating new product ${sku}...`);
    const created = await prisma.product.create({
      data: {
        sku,
        title,
        slug,
        description:
          '<p>Lobhan Dhoop Cones bring the resinous, temple-style depth of Sridattam\'s boldest fragrance into a quick, easy cone format. Light it, place it on any heatproof surface, and let the smoky aroma transform your space in minutes - no holder required.</p>',
        shortDescription:
          'Lobhan Dhoop Cones capture Sridattam\'s deep, smoky, earthy fragrance in an easy-light cone - 36 cones per box for an instant temple-style pooja atmosphere.',
        basePrice: 139,
        salePrice: 139,
        stockQuantity: 450,
        categoryId: category.id,
        status: ProductStatus.active,
        images,
        productType: 'variable' as any,
        attributes: attributes as any,
        variations: dbVariations as any,
        customFields: customFields as any,
      },
    });
    console.log(`Created product: ${created.id} (${created.title})`);
  }

  await prisma.$disconnect();
  await pool.end();
  console.log('Seeding finished successfully!');
}

seedLobhanVariableProduct().catch((err) => {
  console.error(err);
  process.exit(1);
});
