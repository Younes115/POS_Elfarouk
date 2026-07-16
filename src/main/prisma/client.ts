import { PrismaClient } from '@prisma/client';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

let prisma: PrismaClient;

/**
 * Returns (and caches) a PrismaClient configured with the correct
 * database path for both development and production environments.
 *
 * Production:
 *   Database is stored in the OS user-data directory so it survives
 *   app updates and is writable (unlike the ASAR archive).
 *   Path: %APPDATA%/project/database.sqlite  (Windows)
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

    // On first launch, copy the seed database from the app
    // bundle if no database exists yet.
    if (!fs.existsSync(dbPath)) {
      const seedDb = path.join(process.resourcesPath, 'prisma', 'dev.db');
      if (fs.existsSync(seedDb)) {
        // Ensure the target directory exists
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        fs.copyFileSync(seedDb, dbPath);
        console.log('[Prisma] Copied seed database to:', dbPath);
      } else {
        console.log('[Prisma] No seed database found; Prisma will create a new one at:', dbPath);
      }
    }
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
