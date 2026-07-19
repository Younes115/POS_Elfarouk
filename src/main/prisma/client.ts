import { PrismaClient } from '@prisma/client';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

let prisma: PrismaClient;

// ─────────────────────────────────────────────
// Full DDL to create the database schema from scratch.
// Generated via:  npx prisma migrate diff --from-empty --to-schema-datamodel schema.prisma --script
//
// If you change schema.prisma and run a new migration,
// update this SQL to match by re-running the command above.
// ─────────────────────────────────────────────
const SCHEMA_DDL = `
-- Product
CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "color" TEXT,
    "size" TEXT,
    "costPrice" REAL NOT NULL,
    "sellingPrice" REAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Order
CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptNumber" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "subTotal" REAL NOT NULL,
    "discountValue" REAL NOT NULL DEFAULT 0,
    "offerName" TEXT,
    "total" REAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SALE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- OrderItem
CREATE TABLE IF NOT EXISTS "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "quantity" INTEGER NOT NULL,
    "costAtSale" REAL NOT NULL,
    "priceAtSale" REAL NOT NULL,
    "returnedQuantity" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Expense
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product"("sku");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_receiptNumber_key" ON "Order"("receiptNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_invoiceNumber_key" ON "Order"("invoiceNumber");
`;

/**
 * Executes raw SQL statements against the database using Prisma's
 * $executeRawUnsafe. Splits on semicolons and runs each statement
 * individually (SQLite does not support multi-statement exec).
 */
async function execStatements(client: PrismaClient, sql: string): Promise<void> {
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    await client.$executeRawUnsafe(stmt + ';');
  }
}

/**
 * Returns (and caches) a PrismaClient configured with the correct
 * database path for both development and production environments.
 *
 * Production:
 *   Database is stored in the OS user-data directory so it survives
 *   app updates and is writable (unlike the ASAR archive).
 *   Path: %APPDATA%/POS Elfarouk/database.sqlite  (Windows)
 *
 *   On first launch, the database file is created automatically and
 *   the full schema DDL is applied to generate all tables fresh.
 *
 * Development:
 *   Database lives in the project source tree alongside the schema.
 *   Path: <project>/src/main/prisma/dev.db
 */
export function getPrismaClient(): PrismaClient {
  if (prisma) return prisma;

  const isProd = app.isPackaged;

  let dbPath: string;

  if (isProd) {
    // ── Production ──────────────────────────
    // Store the database in the user-data folder so it is
    // writable and persists across application updates.
    const userDataDir = app.getPath('userData');
    dbPath = path.join(userDataDir, 'database.sqlite');

    // Ensure the userData directory exists (it usually does,
    // but be defensive for first-launch edge cases).
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  } else {
    // ── Development ─────────────────────────
    // Use the dev.db next to the schema in the source tree.
    // __dirname points to dist-electron/ when compiled by vite-plugin-electron,
    // so we resolve relative to the project root via app.getAppPath().
    dbPath = path.join(app.getAppPath(), 'src', 'main', 'prisma', 'dev.db');
  }

  const dbUrl = `file:${dbPath}`;
  console.log(`[Prisma] Database URL: ${dbUrl} (isProd=${isProd})`);

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  return prisma;
}

/**
 * Ensures the production database has all required tables.
 * Called once during app startup (after getPrismaClient).
 *
 * - In production, if the database file is new / empty, applies
 *   the full schema DDL so all tables are ready.
 * - In development, this is a no-op because tables are managed
 *   via `prisma migrate dev`.
 */
export async function ensureDatabase(client: PrismaClient): Promise<void> {
  if (!app.isPackaged) {
    // Dev: migrations are handled by the developer via CLI.
    return;
  }

  // Check if the schema has already been applied by looking
  // for the existence of the Product table (any core table works).
  try {
    const result = await client.$queryRawUnsafe<{ name: string }[]>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='Product';`,
    );

    if (result.length > 0) {
      console.log('[Prisma] Database schema already exists — skipping DDL.');
      return;
    }
  } catch {
    // If the query itself fails, the DB is brand new — proceed to create.
  }

  console.log('[Prisma] First launch detected — creating database schema…');
  await execStatements(client, SCHEMA_DDL);
  console.log('[Prisma] Schema created successfully.');
}
