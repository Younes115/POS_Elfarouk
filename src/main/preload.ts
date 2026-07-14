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
  ADD_EXPENSE: 'pos:add-expense',
  GET_DAILY_SUMMARY: 'pos:get-daily-summary',
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

  exchangeItem: (orderItemId: string, qtyToExchange: number, newProductSku: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXCHANGE_ITEM, orderItemId, qtyToExchange, newProductSku),

  // ── Expense ──────────────────────────────
  addExpense: (data: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_EXPENSE, data),

  // ── Daily Summary ────────────────────────
  getDailySummary: (dateStr: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_DAILY_SUMMARY, dateStr),
});
