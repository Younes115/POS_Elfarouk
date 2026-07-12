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

// In-memory store for dev mode — pre-populated with seed data
// so Inventory and Cashier work out of the box during Vite-only dev.
const now = new Date().toISOString();
let idCounter = 12;

let mockProducts: ProductRecord[] = [
  { id: 'mock-1',  sku: 'SNK-AF01', name: 'Nike Air Force 1',              category: 'SNEAKERS', color: 'White', size: '42', costPrice: 950,  sellingPrice: 1450, stock: 12, createdAt: now, updatedAt: now },
  { id: 'mock-2',  sku: 'SNK-YZ02', name: 'Adidas Yeezy Boost 350',       category: 'SNEAKERS', color: 'Black', size: '43', costPrice: 1800, sellingPrice: 2800, stock: 6,  createdAt: now, updatedAt: now },
  { id: 'mock-3',  sku: 'SNK-AM03', name: 'Nike Air Max 90',              category: 'SNEAKERS', color: 'Grey',  size: '44', costPrice: 1100, sellingPrice: 1700, stock: 8,  createdAt: now, updatedAt: now },
  { id: 'mock-4',  sku: 'SNK-NB04', name: 'New Balance 574',              category: 'SNEAKERS', color: 'Navy',  size: '41', costPrice: 750,  sellingPrice: 1200, stock: 15, createdAt: now, updatedAt: now },
  { id: 'mock-5',  sku: 'BAG-GC01', name: 'Gucci Leather Tote',           category: 'BAGS',     color: 'Brown', size: null,  costPrice: 3500, sellingPrice: 5500, stock: 4,  createdAt: now, updatedAt: now },
  { id: 'mock-6',  sku: 'BAG-ZR02', name: 'Zara Crossbody Bag',           category: 'BAGS',     color: 'Black', size: null,  costPrice: 350,  sellingPrice: 650,  stock: 20, createdAt: now, updatedAt: now },
  { id: 'mock-7',  sku: 'BAG-MK03', name: 'Michael Kors Satchel',         category: 'BAGS',     color: 'Beige', size: null,  costPrice: 1200, sellingPrice: 2100, stock: 7,  createdAt: now, updatedAt: now },
  { id: 'mock-8',  sku: 'HEL-RS01', name: 'Classic Red Stiletto',         category: 'HEELS',    color: 'Red',   size: '38', costPrice: 600,  sellingPrice: 1050, stock: 10, createdAt: now, updatedAt: now },
  { id: 'mock-9',  sku: 'HEL-BK02', name: 'Black Office Heels',           category: 'HEELS',    color: 'Black', size: '39', costPrice: 450,  sellingPrice: 800,  stock: 14, createdAt: now, updatedAt: now },
  { id: 'mock-10', sku: 'HEL-ND03', name: 'Nude Platform Heels',          category: 'HEELS',    color: 'Nude',  size: '37', costPrice: 520,  sellingPrice: 900,  stock: 9,  createdAt: now, updatedAt: now },
  { id: 'mock-11', sku: 'HEL-GD04', name: 'Gold Strappy Sandals',         category: 'HEELS',    color: 'Gold',  size: '38', costPrice: 700,  sellingPrice: 1200, stock: 5,  createdAt: now, updatedAt: now },
  { id: 'mock-12', sku: 'SNK-OOS1', name: 'Adidas Ultraboost (SOLD OUT)', category: 'SNEAKERS', color: 'White', size: '42', costPrice: 1400, sellingPrice: 2200, stock: 0,  createdAt: now, updatedAt: now },
];

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

  searchProducts: async (query) => {
    const q = query.toLowerCase();
    const results = mockProducts.filter(
      (p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    ).slice(0, 10);
    return { success: true, data: results };
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

  createOrder: async (orderData, items) => {
    // Validate stock before mutating
    for (const item of items) {
      const product = mockProducts.find((p) => p.id === item.productId);
      if (!product) {
        return { success: false, error: `Product not found: ${item.productId}` };
      }
      if (item.quantity > product.stock) {
        return {
          success: false,
          error: `Insufficient stock for "${product.name}": requested ${item.quantity}, available ${product.stock}`,
        };
      }
    }

    // Decrement stock (mirrors the real Prisma $transaction)
    for (const item of items) {
      const product = mockProducts.find((p) => p.id === item.productId)!;
      product.stock -= item.quantity;
    }

    return {
      success: true,
      data: {
        id: nextId(),
        receiptNumber: orderData.receiptNumber ?? `RCP-${Date.now()}`,
        subTotal: orderData.subTotal ?? 0,
        discountValue: orderData.discountValue ?? 0,
        offerName: orderData.offerName ?? null,
        total: orderData.total ?? 0,
        type: orderData.type ?? 'SALE',
        createdAt: new Date().toISOString(),
        items: items.map((item) => ({
          id: nextId(),
          orderId: '',
          productId: item.productId,
          quantity: item.quantity,
          costAtSale: item.costAtSale,
          priceAtSale: item.priceAtSale,
        })),
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
