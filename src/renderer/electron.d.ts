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
  OrderWithItemsRecord,
  OrderItemRecord,
  ExpenseRecord,
  DailySummary,
  DailyReport,
  MonthlyReport,
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
  addBulkProducts: (data: AddProductInput[]) => Promise<IpcResponse<null>>;
  getProductBySku: (sku: string) => Promise<IpcResponse<ProductRecord | null>>;
  getAllProducts: () => Promise<IpcResponse<ProductRecord[]>>;
  deleteProduct: (id: string) => Promise<IpcResponse<ProductRecord>>;
  updateProduct: (id: string, data: Partial<Omit<AddProductInput, 'sku'>>) => Promise<IpcResponse<ProductRecord>>;
  searchProducts: (query: string) => Promise<IpcResponse<ProductRecord[]>>;
  createOrder: (
    orderData: CreateOrderInput,
    items: CreateOrderItemInput[],
  ) => Promise<IpcResponse<OrderRecord>>;
  getOrderByReceipt: (receiptNumber: string) => Promise<IpcResponse<OrderWithItemsRecord | null>>;
  refundItem: (orderItemId: string, qtyToReturn: number) => Promise<IpcResponse<OrderRecord>>;
  exchangeItem: (orderItemId: string, qtyToExchange: number, newProductSku: string) => Promise<IpcResponse<OrderRecord>>;
  createExpense: (amount: number, category: string, description: string) => Promise<IpcResponse<ExpenseRecord>>;
  getDailyExpenses: (dateStr: string) => Promise<IpcResponse<ExpenseRecord[]>>;
  deleteExpense: (id: string) => Promise<IpcResponse<ExpenseRecord>>;
  getDailySummary: (dateStr: string) => Promise<IpcResponse<DailySummary>>;
  getDailyReport: (dateStr: string) => Promise<IpcResponse<DailyReport>>;
  getMonthlyReport: (year: number, month: number) => Promise<IpcResponse<MonthlyReport>>;
  printSilent: () => Promise<IpcResponse<boolean>>;
}

declare global {
  interface Window {
    api: PosApi;
  }
}
