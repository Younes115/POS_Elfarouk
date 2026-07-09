// ─────────────────────────────────────────────
// Type augmentation for the `window.api` object
// exposed by the preload script via contextBridge.
// Import this file (or include it in tsconfig) so
// the renderer can call window.api.* with full types.
// ─────────────────────────────────────────────

import type {
  AddProductInput,
  ProductRecord,
  CreateOrderInput,
  CreateOrderItemInput,
  OrderRecord,
  AddExpenseInput,
  ExpenseRecord,
  DailySummary,
} from '../main/types.js';

interface IpcSuccess<T> {
  success: true;
  data: T;
}

interface IpcError {
  success: false;
  error: string;
}

type IpcResponse<T> = IpcSuccess<T> | IpcError;

export interface PosApi {
  addProduct: (data: AddProductInput) => Promise<IpcResponse<ProductRecord>>;
  getProductBySku: (sku: string) => Promise<IpcResponse<ProductRecord | null>>;
  getAllProducts: () => Promise<IpcResponse<ProductRecord[]>>;
  deleteProduct: (id: string) => Promise<IpcResponse<ProductRecord>>;
  createOrder: (
    orderData: CreateOrderInput,
    items: CreateOrderItemInput[],
  ) => Promise<IpcResponse<OrderRecord>>;
  addExpense: (data: AddExpenseInput) => Promise<IpcResponse<ExpenseRecord>>;
  getDailySummary: (dateStr: string) => Promise<IpcResponse<DailySummary>>;
}

declare global {
  interface Window {
    api: PosApi;
  }
}
