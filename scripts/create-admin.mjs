#!/usr/bin/env node
/**
 * Admin seed script — creates the first admin user.
 * Run once after deployment:
 *   node scripts/create-admin.mjs
 *
 * Reads INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD from .env
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

if (process.env.NODE_ENV !== 'production') {
  const { config } = await import('dotenv');
  config();
}

const prisma = new PrismaClient();

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('ERROR: INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('ERROR: Admin password must be at least 12 characters.');
    process.exit(1);
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin account already exists for ${email}. No changes made.`);
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.create({ data: { email, passwordHash } });

  console.log(`✅ Admin account created for ${email}`);
  console.log('   Log in at /admin');
  console.log('   IMPORTANT: Remove INITIAL_ADMIN_PASSWORD from .env after first login.');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
