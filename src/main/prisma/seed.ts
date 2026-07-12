// ─────────────────────────────────────────────
// Database Seeder — Populates the dev SQLite DB
// with realistic dummy products for testing.
//
// Usage:  npm run seed
//         (or: npx tsx src/main/prisma/seed.ts)
//
// Safe to re-run: deletes existing products first.
// ─────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'src/main/prisma/dev.db');

const prisma = new PrismaClient({
  datasources: { db: { url: `file:${dbPath}` } },
});

// ── Seed Data ────────────────────────────────

const PRODUCTS = [
  // ── SNEAKERS ──────────────────────────────
  {
    sku: 'SNK-AF01',
    name: 'Nike Air Force 1',
    category: 'SNEAKERS',
    color: 'White',
    size: '42',
    costPrice: 950,
    sellingPrice: 1450,
    stock: 12,
  },
  {
    sku: 'SNK-YZ02',
    name: 'Adidas Yeezy Boost 350',
    category: 'SNEAKERS',
    color: 'Black',
    size: '43',
    costPrice: 1800,
    sellingPrice: 2800,
    stock: 6,
  },
  {
    sku: 'SNK-AM03',
    name: 'Nike Air Max 90',
    category: 'SNEAKERS',
    color: 'Grey',
    size: '44',
    costPrice: 1100,
    sellingPrice: 1700,
    stock: 8,
  },
  {
    sku: 'SNK-NB04',
    name: 'New Balance 574',
    category: 'SNEAKERS',
    color: 'Navy',
    size: '41',
    costPrice: 750,
    sellingPrice: 1200,
    stock: 15,
  },

  // ── BAGS ──────────────────────────────────
  {
    sku: 'BAG-GC01',
    name: 'Gucci Leather Tote',
    category: 'BAGS',
    color: 'Brown',
    size: null,
    costPrice: 3500,
    sellingPrice: 5500,
    stock: 4,
  },
  {
    sku: 'BAG-ZR02',
    name: 'Zara Crossbody Bag',
    category: 'BAGS',
    color: 'Black',
    size: null,
    costPrice: 350,
    sellingPrice: 650,
    stock: 20,
  },
  {
    sku: 'BAG-MK03',
    name: 'Michael Kors Satchel',
    category: 'BAGS',
    color: 'Beige',
    size: null,
    costPrice: 1200,
    sellingPrice: 2100,
    stock: 7,
  },

  // ── HEELS ─────────────────────────────────
  {
    sku: 'HEL-RS01',
    name: 'Classic Red Stiletto',
    category: 'HEELS',
    color: 'Red',
    size: '38',
    costPrice: 600,
    sellingPrice: 1050,
    stock: 10,
  },
  {
    sku: 'HEL-BK02',
    name: 'Black Office Heels',
    category: 'HEELS',
    color: 'Black',
    size: '39',
    costPrice: 450,
    sellingPrice: 800,
    stock: 14,
  },
  {
    sku: 'HEL-ND03',
    name: 'Nude Platform Heels',
    category: 'HEELS',
    color: 'Nude',
    size: '37',
    costPrice: 520,
    sellingPrice: 900,
    stock: 9,
  },
  {
    sku: 'HEL-GD04',
    name: 'Gold Strappy Sandals',
    category: 'HEELS',
    color: 'Gold',
    size: '38',
    costPrice: 700,
    sellingPrice: 1200,
    stock: 5,
  },

  // ── Bonus: out-of-stock item for testing ──
  {
    sku: 'SNK-OOS1',
    name: 'Adidas Ultraboost (SOLD OUT)',
    category: 'SNEAKERS',
    color: 'White',
    size: '42',
    costPrice: 1400,
    sellingPrice: 2200,
    stock: 0,
  },
] as const;

// ── Main ─────────────────────────────────────

async function main() {
  console.log('🌱 Starting database seed...\n');

  // 1. Clean slate — delete all existing products
  //    (OrderItems with SetNull will just get productId = null)
  const deleted = await prisma.product.deleteMany();
  console.log(`🗑  Cleared ${deleted.count} existing product(s).`);

  // 2. Insert seed products
  console.log(`📦 Inserting ${PRODUCTS.length} products...\n`);

  for (const data of PRODUCTS) {
    const product = await prisma.product.create({ data });
    console.log(
      `   ✅  ${product.category.padEnd(10)} | ${product.sku.padEnd(10)} | ${product.name} (stock: ${product.stock})`,
    );
  }

  console.log(`\n🎉 Seed complete! ${PRODUCTS.length} products inserted.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
