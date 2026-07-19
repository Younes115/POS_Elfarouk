// ─────────────────────────────────────────────
// Preload Script — Exposes a safe, typed API
// from the main process to the renderer via
// contextBridge. The renderer calls window.api.*
// and never touches Node or IPC directly.
// ─────────────────────────────────────────────

import { contextBridge, ipcRenderer } from 'electron';

const IPC_CHANNELS = {
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
} as const;

contextBridge.exposeInMainWorld('api', {
  // ── Product ──────────────────────────────
  addProduct: (data: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_PRODUCT, data),

  addBulkProducts: (data: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_BULK_PRODUCTS, data),

  getProductBySku: (sku: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PRODUCT_BY_SKU, sku),

  getAllProducts: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_ALL_PRODUCTS),

  deleteProduct: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_PRODUCT, id),

  updateProduct: (id: string, data: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PRODUCT, id, data),

  searchProducts: (query: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_PRODUCTS, query),

  // ── Order ────────────────────────────────
  createOrder: (orderData: unknown, items: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_ORDER, orderData, items),

  // ── Returns & Exchanges ──────────────────
  getOrderByReceipt: (receiptNumber: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_ORDER_BY_RECEIPT, receiptNumber),

  refundItem: (orderItemId: string, qtyToReturn: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.REFUND_ITEM, orderItemId, qtyToReturn),

  exchangeItem: (orderItemId: string, qtyToExchange: number, newProductSku: string, customPrice?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXCHANGE_ITEM, orderItemId, qtyToExchange, newProductSku, customPrice),

  // ── Expense ──────────────────────────────
  createExpense: (amount: number, category: string, description: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_EXPENSE, amount, category, description),

  getDailyExpenses: (dateStr: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_DAILY_EXPENSES, dateStr),

  deleteExpense: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_EXPENSE, id),

  // ── Daily Summary ────────────────────────
  getDailySummary: (dateStr: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_DAILY_SUMMARY, dateStr),

  // ── Reports (Accounting Engine) ──────────
  getDailyReport: (dateStr: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_DAILY_REPORT, dateStr),

  getMonthlyReport: (year: number, month: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_MONTHLY_REPORT, year, month),

  // ── Print ────────────────────────────────
  printSilent: () =>
    ipcRenderer.invoke(IPC_CHANNELS.PRINT_SILENT),
});
