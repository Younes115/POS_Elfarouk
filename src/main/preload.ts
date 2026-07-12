// ─────────────────────────────────────────────
// Preload Script — Exposes a safe, typed API
// from the main process to the renderer via
// contextBridge. The renderer calls window.api.*
// and never touches Node or IPC directly.
// ─────────────────────────────────────────────

import { contextBridge, ipcRenderer } from 'electron';

const IPC_CHANNELS = {
  ADD_PRODUCT: 'pos:add-product',
  GET_PRODUCT_BY_SKU: 'pos:get-product-by-sku',
  GET_ALL_PRODUCTS: 'pos:get-all-products',
  DELETE_PRODUCT: 'pos:delete-product',
  SEARCH_PRODUCTS: 'pos:search-products',
  CREATE_ORDER: 'pos:create-order',
  ADD_EXPENSE: 'pos:add-expense',
  GET_DAILY_SUMMARY: 'pos:get-daily-summary',
} as const;

contextBridge.exposeInMainWorld('api', {
  // ── Product ──────────────────────────────
  addProduct: (data: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_PRODUCT, data),

  getProductBySku: (sku: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PRODUCT_BY_SKU, sku),

  getAllProducts: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_ALL_PRODUCTS),

  deleteProduct: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_PRODUCT, id),

  searchProducts: (query: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_PRODUCTS, query),

  // ── Order ────────────────────────────────
  createOrder: (orderData: unknown, items: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_ORDER, orderData, items),

  // ── Expense ──────────────────────────────
  addExpense: (data: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_EXPENSE, data),

  // ── Daily Summary ────────────────────────
  getDailySummary: (dateStr: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_DAILY_SUMMARY, dateStr),
});
