// Creates the first admin account. Safe to run in production (unlike seed.ts).
// Usage (inside the backend container):
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npx ts-node prisma/create-admin.ts
// Optional: ADMIN_FIRST_NAME, ADMIN_LAST_NAME. Refuses to touch an existing account.
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? '';
const firstName = process.env.ADMIN_FIRST_NAME?.trim() || 'Admin';
const lastName = process.env.ADMIN_LAST_NAME?.trim() || 'User';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  if (!process.env.DATABASE_URL) fail('DATABASE_URL is required.');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('Set ADMIN_EMAIL to a valid email address.');
  if (password.length < 12) fail('Set ADMIN_PASSWORD to at least 12 characters.');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) fail(`A user with email ${email} already exists (role: ${existing.role}). Nothing changed.`);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: UserRole.admin,
        firstName,
        lastName,
      },
    });
    console.log(`Created admin ${user.email} (id ${user.id}).`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => fail(`Failed to create admin: ${err?.message ?? err}`));
