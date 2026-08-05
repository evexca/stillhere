/**
 * Prisma seed — initializes required database records.
 * Run with: npx prisma db seed
 *
 * Creates:
 * - Initial SiteGeneration (generation 1)
 * - 20 daily themes
 * - Default site settings
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const THEMES = [
  'A confession you have never told anyone',
  'An unpopular opinion you genuinely believe',
  'A secret from work',
  'Your most embarrassing story',
  'The love that never happened',
  'Am I the problem?',
  'Something you would never tell your family',
  'A paranormal experience you cannot explain',
  'Questions only',
  'One sentence with no context',
  'A decision you still regret',
  'The kindest thing a stranger ever did for you',
  'Something everyone pretends to enjoy',
  'A lie you told that became too big',
  'The moment you knew it was over',
  'Something you wish someone would ask you',
  'A harmless secret',
  'A strange childhood memory',
  'A message you will never send',
  'A belief you recently changed',
];

const DEFAULT_SETTINGS = [
  { key: 'adsEnabled', value: 'false' },
  { key: 'maintenanceMode', value: 'false' },
  { key: 'moderationMode', value: 'standard' }, // 'standard' | 'strict' | 'off'
];

async function main() {
  console.log('🌱 Seeding database...');

  // ── Daily themes ──────────────────────────────────────────────────────────
  for (let i = 0; i < THEMES.length; i++) {
    await prisma.dailyTheme.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        id: i + 1,
        text: THEMES[i],
        active: true,
        sortOrder: i,
      },
    });
  }
  console.log(`✅ Created ${THEMES.length} daily themes.`);

  // ── Site settings ─────────────────────────────────────────────────────────
  for (const { key, value } of DEFAULT_SETTINGS) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  console.log('✅ Created default site settings.');

  // ── First site generation ─────────────────────────────────────────────────
  const existingGen = await prisma.siteGeneration.findFirst({
    where: { status: 'ACTIVE' },
  });

  if (!existingGen) {
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    await prisma.siteGeneration.create({
      data: {
        generationNum: 1,
        status: 'ACTIVE',
        expiresAt,
      },
    });
    console.log('✅ Created first site generation (Generation 1).');
  } else {
    console.log(`ℹ️  Active generation ${existingGen.generationNum} already exists. Skipping.`);
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
