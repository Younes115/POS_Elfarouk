// ─────────────────────────────────────────────
// IPC Handlers — Secure bridge between
// the renderer (React) and the main process (Node).
//
// Each handler wraps a posService function and
// performs basic error handling so the renderer
// always gets a clean { success, data?, error? }
// envelope instead of raw exceptions.
// ─────────────────────────────────────────────

import { ipcMain } from 'electron';
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

export function registerIpcHandlers(service: PosService): void {
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
    async (_event, orderItemId: string, qtyToExchange: number, newProductSku: string) => {
      try {
        const result = await service.exchangeItem(orderItemId, qtyToExchange, newProductSku);
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );
}
