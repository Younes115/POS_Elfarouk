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
  AddExpenseInput,
} from './types.js';

// ── IPC Channel Constants ────────────────────

export const IPC_CHANNELS = {
  ADD_PRODUCT: 'pos:add-product',
  GET_PRODUCT_BY_SKU: 'pos:get-product-by-sku',
  GET_ALL_PRODUCTS: 'pos:get-all-products',
  DELETE_PRODUCT: 'pos:delete-product',
  CREATE_ORDER: 'pos:create-order',
  ADD_EXPENSE: 'pos:add-expense',
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
    IPC_CHANNELS.ADD_EXPENSE,
    async (_event, data: AddExpenseInput) => {
      try {
        const expense = await service.addExpense(data);
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
}
