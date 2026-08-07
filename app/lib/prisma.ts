/**
 * Prisma client singleton.
 * In development, prevents creating too many connections during hot reload.
 * In production, reuses a single Prisma instance across the app.
 *
 * Uses the MariaDB/MySQL driver adapter instead of Prisma's Rust query
 * engine: Hostinger's shared hosting blocks spawning the engine subprocess
 * (EAGAIN on exec), so the generator is configured with engineType =
 * "client" in schema.prisma and Prisma Client talks to the database
 * directly through this adapter — no Rust binary involved.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createAdapter(): PrismaMariaDb {
  const url = new URL(process.env.DATABASE_URL ?? '');
  return new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    connectionLimit: 3, // small pool, appropriate for shared hosting
  });
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: createAdapter(),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
