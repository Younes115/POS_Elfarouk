import path from 'path';
import { execSync } from 'child_process';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { createPosService } from '../src/main/services/posService.js';

/**
 * Creates an isolated SQLite database and Prisma Client
 * for a specific test file.
 */
export function setupTestEnvironment(dbName: string) {
  const testDbPath = path.resolve(dbName).replace(/\\/g, '/');
  const testDbUrl = `file:${testDbPath}`;

  const prisma = new PrismaClient({
    datasources: { db: { url: testDbUrl } },
  });

  const tmpSchemaName = dbName.replace('.db', '');
  const tmpSchemaPath = `src/main/prisma/schema.${tmpSchemaName}.test.prisma`;

  return {
    prisma,
    service: createPosService(prisma),
    
    // Call in beforeAll
    init: () => {
      const schemaSource = fs.readFileSync('src/main/prisma/schema.prisma', 'utf-8');
      const testSchema = schemaSource.replace(
        /url\s*=\s*"file:\.\/dev\.db"/,
        `url = "${testDbUrl}"`
      );

      fs.writeFileSync(tmpSchemaPath, testSchema);
      
      try {
        execSync(`npx.cmd prisma db push --schema=${tmpSchemaPath} --force-reset --accept-data-loss --skip-generate`, {
          stdio: 'pipe',
        });
      } finally {
        if (fs.existsSync(tmpSchemaPath)) {
          fs.unlinkSync(tmpSchemaPath);
        }
      }
    },

    // Call in afterAll
    cleanup: async () => {
      await prisma.$disconnect();
      // Optionally delete the test.db file if we want
    }
  };
}
