// ─────────────────────────────────────────────
// IPC Handlers — Secure bridge between
// the renderer (React) and the main process (Node).
//
// Each handler wraps a posService function and
// performs basic error handling so the renderer
// always gets a clean { success, data?, error? }
// envelope instead of raw exceptions.
// ─────────────────────────────────────────────

import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import type { PrismaClient } from '@prisma/client';
import type { PosService } from './services/posService.js';
import type {
  AddProductInput,
  CreateOrderInput,
  CreateOrderItemInput,
} from './types.js';

// ── IPC Channel Constants ────────────────────

export const IPC_CHANNELS = {
  ADD_PRODUCT: 'pos:add-product',
  ADD_BULK_PRODUCTS: 'pos:add-bulk-products',
  GET_PRODUCT_BY_SKU: 'pos:get-product-by-sku',
  GET_ALL_PRODUCTS: 'pos:get-all-products',
  DELETE_PRODUCT: 'pos:delete-product',
  UPDATE_PRODUCT: 'pos:update-product',
  SEARCH_PRODUCTS: 'pos:search-products',
  CREATE_ORDER: 'pos:create-order',
  GET_ORDER_BY_RECEIPT: 'pos:get-order-by-receipt',
  REFUND_ITEM: 'pos:refund-item',
  EXCHANGE_ITEM: 'pos:exchange-item',
  CREATE_EXPENSE: 'pos:create-expense',
  GET_DAILY_EXPENSES: 'pos:get-daily-expenses',
  DELETE_EXPENSE: 'pos:delete-expense',
  GET_DAILY_SUMMARY: 'pos:get-daily-summary',
  GET_DAILY_REPORT: 'pos:get-daily-report',
  GET_MONTHLY_REPORT: 'pos:get-monthly-report',
  PRINT_SILENT: 'pos:print-silent',
  BACKUP_DATABASE: 'pos:backup-database',
  RESTORE_DATABASE: 'pos:restore-database',
} as const;

// ── Response Envelope ────────────────────────

interface IpcSuccess<T> {
  success: true;
  data: T;
}

interface IpcError {
  success: false;
  error: string;
}

type IpcResponse<T> = IpcSuccess<T> | IpcError;

function ok<T>(data: T): IpcResponse<T> {
  return { success: true, data };
}

function fail(err: unknown): IpcResponse<never> {
  const message = err instanceof Error ? err.message : String(err);
  return { success: false, error: message };
}

// ── Registration ─────────────────────────────

export function registerIpcHandlers(service: PosService, prisma?: PrismaClient): void {
  // ── Product ──────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.ADD_PRODUCT,
    async (_event, data: AddProductInput) => {
      try {
        const product = await service.addProduct(data);
        return ok(product);
      } catch (err) {
        return fail(err);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ADD_BULK_PRODUCTS,
    async (_event, data: AddProductInput[]) => {
      try {
        await service.addBulkProducts(data);
        return ok(null);
      } catch (err) {
        return fail(err);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_PRODUCT_BY_SKU,
    async (_event, sku: string) => {
      try {
        const product = await service.getProductBySku(sku);
        return ok(product);
      } catch (err) {
        return fail(err);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_ALL_PRODUCTS,
    async () => {
      try {
        const products = await service.getAllProducts();
        return ok(products);
      } catch (err) {
        return fail(err);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DELETE_PRODUCT,
    async (_event, id: string) => {
      try {
        const result = await service.deleteProduct(id);
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.UPDATE_PRODUCT,
    async (_event, id: string, data: Partial<AddProductInput>) => {
      try {
        const product = await service.updateProduct(id, data);
        return ok(product);
      } catch (err) {
        return fail(err);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SEARCH_PRODUCTS,
    async (_event, query: string) => {
      try {
        const products = await service.searchProducts(query);
        return ok(products);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // ── Order ────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.CREATE_ORDER,
    async (
      _event,
      orderData: CreateOrderInput,
      items: CreateOrderItemInput[],
    ) => {
      try {
        const order = await service.createOrder(orderData, items);
        return ok(order);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // ── Expense ──────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.CREATE_EXPENSE,
    async (_event, amount: number, category: string, description: string) => {
      try {
        const expense = await service.createExpense(amount, category, description);
        return ok(expense);
      } catch (err) {
        return fail(err);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_DAILY_EXPENSES,
    async (_event, dateStr: string) => {
      try {
        const expenses = await service.getDailyExpenses(dateStr);
        return ok(expenses);
      } catch (err) {
        return fail(err);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DELETE_EXPENSE,
    async (_event, id: string) => {
      try {
        const expense = await service.deleteExpense(id);
        return ok(expense);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // ── Daily Summary ────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.GET_DAILY_SUMMARY,
    async (_event, dateStr: string) => {
      try {
        const summary = await service.getDailySummary(dateStr);
        return ok(summary);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // ── Reports (Accounting Engine) ──────────

  ipcMain.handle(
    IPC_CHANNELS.GET_DAILY_REPORT,
    async (_event, dateStr: string) => {
      try {
        const report = await service.getDailyReport(dateStr);
        return ok(report);
      } catch (err) {
        return fail(err);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_MONTHLY_REPORT,
    async (_event, year: number, month: number) => {
      try {
        const report = await service.getMonthlyReport(year, month);
        return ok(report);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // ── Returns & Exchanges ──────────────────

  ipcMain.handle(
    IPC_CHANNELS.GET_ORDER_BY_RECEIPT,
    async (_event, receiptNumber: string) => {
      try {
        const order = await service.getOrderByReceipt(receiptNumber);
        return ok(order);
      } catch (err) {
        return fail(err);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.REFUND_ITEM,
    async (_event, orderItemId: string, qtyToReturn: number) => {
      try {
        const result = await service.refundItem(orderItemId, qtyToReturn);
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.EXCHANGE_ITEM,
    async (_event, orderItemId: string, qtyToExchange: number, newProductSku: string, customPrice?: number) => {
      try {
        const result = await service.exchangeItem(orderItemId, qtyToExchange, newProductSku, customPrice);
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // ── Print ──────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.PRINT_SILENT, async (event) => {
    try {
      console.log('[IPC] PRINT_SILENT triggered on backend!');
      // Await the print command. If we don't await it, the IPC resolves instantly,
      // the frontend destroys the Receipt DOM, and the print job fails because the DOM is gone.
      await event.sender.print({
        silent: true, // Switched to true to ensure direct, dialog-free printing
        printBackground: true,
        color: false,
        margins: { marginType: 'printableArea' }
      });
      
      return ok(true);
    } catch (err) {
      return fail(err);
    }
  });

  // ── Database Backup ───────────────────────

  ipcMain.handle(IPC_CHANNELS.BACKUP_DATABASE, async () => {
    try {
      // ── 1. Resolve the current database path ──
      const isProd = app.isPackaged;
      let dbPath: string;

      if (isProd) {
        dbPath = path.join(app.getPath('userData'), 'database.sqlite');
      } else {
        dbPath = path.join(app.getAppPath(), 'src', 'main', 'prisma', 'dev.db');
      }

      // Ensure the source database actually exists
      if (!fs.existsSync(dbPath)) {
        return fail('Database file not found at: ' + dbPath);
      }

      // ── 2. Build a date-stamped default filename ──
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm   = String(now.getMonth() + 1).padStart(2, '0');
      const dd   = String(now.getDate()).padStart(2, '0');
      const defaultName = `POS_Backup_${yyyy}-${mm}-${dd}.sqlite`;

      // ── 3. Show native "Save As" dialog ──
      const focusedWindow = BrowserWindow.getFocusedWindow();
      const { canceled, filePath: destPath } = await dialog.showSaveDialog(
        focusedWindow!,
        {
          title: 'Save Database Backup',
          defaultPath: defaultName,
          filters: [
            { name: 'SQLite Database', extensions: ['sqlite', 'db'] },
            { name: 'All Files',       extensions: ['*'] },
          ],
        },
      );

      if (canceled || !destPath) {
        return { success: false, error: 'Backup cancelled by user.' };
      }

      // ── 4. Copy the database file ──
      fs.copyFileSync(dbPath, destPath);

      return ok(`Backup saved successfully to:\n${destPath}`);
    } catch (err) {
      return fail(err);
    }
  });

  // ── Database Restore ──────────────────────

  ipcMain.handle(IPC_CHANNELS.RESTORE_DATABASE, async () => {
    try {
      // ── 1. Show native "Open" dialog filtered to SQLite files ──
      const focusedWindow = BrowserWindow.getFocusedWindow();
      const { canceled, filePaths } = await dialog.showOpenDialog(
        focusedWindow!,
        {
          title: 'Select Database Backup to Restore',
          properties: ['openFile'],
          filters: [
            { name: 'SQLite Database', extensions: ['sqlite', 'db'] },
            { name: 'All Files',       extensions: ['*'] },
          ],
        },
      );

      if (canceled || filePaths.length === 0) {
        return { success: false, error: 'Restore cancelled by user.' };
      }

      const sourcePath = filePaths[0];

      // Verify the selected file actually exists and is readable
      if (!fs.existsSync(sourcePath)) {
        return fail('Selected backup file does not exist.');
      }

      // ── 2. Resolve the current database path ──
      const isProd = app.isPackaged;
      let dbPath: string;

      if (isProd) {
        dbPath = path.join(app.getPath('userData'), 'database.sqlite');
      } else {
        dbPath = path.join(app.getAppPath(), 'src', 'main', 'prisma', 'dev.db');
      }

      // ── 3. Disconnect Prisma to release file lock ──
      if (prisma) {
        console.log('[Restore] Disconnecting Prisma client…');
        await prisma.$disconnect();
        console.log('[Restore] Prisma disconnected.');
      }

      // ── 4. Overwrite the active database with the backup ──
      fs.copyFileSync(sourcePath, dbPath);
      console.log('[Restore] Database replaced from:', sourcePath);

      // ── 5. Relaunch the application ──
      //    app.relaunch() schedules a restart, app.exit() terminates
      //    the current instance immediately so Prisma re-initialises
      //    cleanly on the fresh launch.
      app.relaunch();
      app.exit(0);

      // This line is unreachable but satisfies the return type
      return ok('Database restored. Application is restarting…');
    } catch (err) {
      return fail(err);
    }
  });
}
