import { PrismaClient } from '@prisma/client';
import { app } from 'electron';
import path from 'path';

let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (prisma) return prisma;

  const isProd = app.isPackaged;
  
  // Construct the dynamic path for the SQLite database
  const dbPath = isProd 
    ? path.join(app.getPath('userData'), 'database.sqlite')
    : path.join(__dirname, '..', '..', '..', 'src', 'main', 'prisma', 'dev.db'); // Fallback to local dev db

  const dbUrl = `file:${dbPath}`;

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  return prisma;
}
