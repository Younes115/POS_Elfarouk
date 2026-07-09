// ─────────────────────────────────────────────
// Dev-Mode API Mock — When running `npm run dev`
// (Vite only, no Electron), window.api is undefined
// because there is no preload script / contextBridge.
//
// This module provides an in-memory mock so the
// UI can be developed and tested without launching
// Electron. Import it early in main.tsx.
// ─────────────────────────────────────────────

import type { PosApi } from './electron';
import type { ProductRecord } from '../main/types';

// In-memory store for dev mode
let mockProducts: ProductRecord[] = [];
let idCounter = 0;

function nextId() {
  return `mock-${++idCounter}`;
}

const mockApi: PosApi = {
  addProduct: async (data) => {
    const now = new Date().toISOString();
    const product: ProductRecord = {
      id: nextId(),
      sku: data.sku,
      name: data.name,
      category: data.category,
      color: data.color ?? null,
      size: data.size ?? null,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      stock: data.stock ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    mockProducts.unshift(product);
    return { success: true, data: product };
  },

  getProductBySku: async (sku) => {
    const product = mockProducts.find((p) => p.sku === sku) ?? null;
    return { success: true, data: product };
  },

  getAllProducts: async () => {
    return { success: true, data: [...mockProducts] };
  },

  deleteProduct: async (id: string) => {
    const idx = mockProducts.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const [deleted] = mockProducts.splice(idx, 1);
      return { success: true, data: deleted };
    }
    return { success: false, error: 'Product not found' };
  },

  createOrder: async (_orderData, _items) => {
    return {
      success: true,
      data: {
        id: nextId(),
        receiptNumber: `RCP-${Date.now()}`,
        subTotal: 0,
        discountValue: 0,
        offerName: null,
        total: 0,
        type: 'SALE',
        createdAt: new Date().toISOString(),
        items: [],
      },
    };
  },

  addExpense: async (data) => {
    return {
      success: true,
      data: {
        id: nextId(),
        description: data.description,
        amount: data.amount,
        createdAt: new Date().toISOString(),
      },
    };
  },

  getDailySummary: async (dateStr) => {
    return {
      success: true,
      data: {
        date: dateStr,
        totalSales: 0,
        totalReturns: 0,
        totalExpenses: 0,
        netCash: 0,
        orderCount: 0,
        returnCount: 0,
      },
    };
  },
};

/**
 * Call this once at app startup (main.tsx).
 * If window.api already exists (Electron preload ran), this is a no-op.
 * If it doesn't (Vite-only dev), it injects the mock.
 */
export function initDevApi(): void {
  if (typeof window !== 'undefined' && !window.api) {
    console.warn(
      '[DEV] window.api not found — injecting in-memory mock. ' +
        'Data will NOT persist. Run via Electron for real DB access.'
    );
    window.api = mockApi;
  }
}
