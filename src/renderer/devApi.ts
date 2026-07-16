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
import type { ProductRecord, OrderItemRecord } from '../main/types';

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

// In-memory order store so Returns page mock can look up by receipt
interface MockOrderItem extends OrderItemRecord {
  returnedQuantity: number;
}
interface MockOrder {
  id: string;
  receiptNumber: string;
  subTotal: number;
  discountValue: number;
  offerName: string | null;
  total: number;
  type: string;
  createdAt: string;
  items: MockOrderItem[];
}
const mockOrders: MockOrder[] = [];
const mockExpenses: { id: string; category: string; description: string; amount: number; createdAt: string }[] = [];

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

  addBulkProducts: async (productsData) => {
    const now = new Date().toISOString();
    const newProducts = productsData.map(data => ({
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
    }));
    mockProducts.unshift(...newProducts.reverse());
    return { success: true, data: null };
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

  updateProduct: async (id: string, data: Partial<ProductRecord>) => {
    const product = mockProducts.find((p) => p.id === id);
    if (!product) {
      return { success: false, error: 'Product not found' };
    }
    if (data.name !== undefined) product.name = data.name;
    if (data.color !== undefined) product.color = data.color ?? null;
    if (data.size !== undefined) product.size = data.size ?? null;
    if (data.costPrice !== undefined) product.costPrice = data.costPrice;
    if (data.sellingPrice !== undefined) product.sellingPrice = data.sellingPrice;
    if (data.stock !== undefined) product.stock = data.stock;
    product.updatedAt = new Date().toISOString();
    return { success: true, data: { ...product } };
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

    const orderId = nextId();
    const orderItems = items.map((item) => ({
      id: nextId(),
      orderId,
      productId: item.productId,
      quantity: item.quantity,
      costAtSale: item.costAtSale,
      priceAtSale: item.priceAtSale,
      returnedQuantity: 0,
    }));

    const order = {
      id: orderId,
      receiptNumber: orderData.receiptNumber ?? `RCP-${Date.now()}`,
      subTotal: orderData.subTotal ?? 0,
      discountValue: orderData.discountValue ?? 0,
      offerName: orderData.offerName ?? null,
      total: orderData.total ?? 0,
      type: orderData.type ?? 'SALE',
      createdAt: new Date().toISOString(),
      items: orderItems,
    };

    mockOrders.push(order);

    return {
      success: true,
      data: order,
    };
  },

  createExpense: async (amount, category, description) => {
    if (amount <= 0) return { success: false, error: 'Expense amount must be greater than 0.' };
    if (!category || category.trim() === '') return { success: false, error: 'Expense category is required.' };
    if (!description || description.trim() === '') return { success: false, error: 'Expense description is required.' };
    const expense = {
      id: nextId(),
      category: category.trim(),
      description: description.trim(),
      amount,
      createdAt: new Date().toISOString(),
    };
    mockExpenses.push(expense);
    return { success: true, data: expense };
  },

  getDailyExpenses: async (dateStr) => {
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);
    const filtered = mockExpenses.filter((e) => {
      const d = new Date(e.createdAt);
      return d >= start && d <= end;
    });
    return { success: true, data: filtered };
  },

  deleteExpense: async (id) => {
    const idx = mockExpenses.findIndex((e) => e.id === id);
    if (idx === -1) return { success: false, error: 'Expense not found' };
    const [deleted] = mockExpenses.splice(idx, 1);
    return { success: true, data: deleted };
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

  getOrderByReceipt: async (receiptNumber) => {
    const order = mockOrders.find((o) => o.receiptNumber === receiptNumber);
    if (!order) return { success: true, data: null };
    return {
      success: true,
      data: {
        ...order,
        items: order.items.map((item) => ({
          ...item,
          product: mockProducts.find((p) => p.id === item.productId) ?? null,
        })),
      },
    };
  },

  refundItem: async (orderItemId, qtyToReturn) => {
    for (const order of mockOrders) {
      const item = order.items.find((i) => i.id === orderItemId);
      if (item) {
        if (qtyToReturn <= 0) {
          return { success: false, error: 'Quantity to return must be greater than 0.' };
        }
        if (item.returnedQuantity + qtyToReturn > item.quantity) {
          return { success: false, error: `Cannot return ${qtyToReturn} — only ${item.quantity - item.returnedQuantity} remaining.` };
        }
        item.returnedQuantity += qtyToReturn;
        const product = mockProducts.find((p) => p.id === item.productId);
        if (product) product.stock += qtyToReturn;
        return { success: true, data: { ...item } };
      }
    }
    return { success: false, error: 'Order item not found' };
  },

  exchangeItem: async (orderItemId, qtyToExchange, newProductSku) => {
    for (const order of mockOrders) {
      const oldItem = order.items.find((i) => i.id === orderItemId);
      if (oldItem) {
        if (qtyToExchange <= 0) {
          return { success: false, error: 'Quantity to exchange must be greater than 0.' };
        }
        if (oldItem.returnedQuantity + qtyToExchange > oldItem.quantity) {
          return { success: false, error: `Cannot exchange ${qtyToExchange} — only ${oldItem.quantity - oldItem.returnedQuantity} remaining.` };
        }
        const newProduct = mockProducts.find((p) => p.sku === newProductSku);
        if (!newProduct) {
          return { success: false, error: `Product not found with SKU: ${newProductSku}` };
        }
        if (newProduct.stock < qtyToExchange) {
          return { success: false, error: `Insufficient stock for "${newProduct.name}"` };
        }
        // Increment returnedQuantity on old item, restore stock
        oldItem.returnedQuantity += qtyToExchange;
        const oldProduct = mockProducts.find((p) => p.id === oldItem.productId);
        if (oldProduct) oldProduct.stock += qtyToExchange;
        // Decrement new product stock
        newProduct.stock -= qtyToExchange;
        // Create new order item
        const newItem = {
          id: nextId(),
          orderId: order.id,
          productId: newProduct.id,
          quantity: qtyToExchange,
          costAtSale: newProduct.costPrice,
          priceAtSale: newProduct.sellingPrice,
          returnedQuantity: 0,
          product: { ...newProduct },
        };
        order.items.push(newItem);
        return { success: true, data: newItem };
      }
    }
    return { success: false, error: 'Order item not found' };
  },

  getDailyReport: async (dateStr) => {
    // Simple mock: derive data from mock expenses/orders for the given day
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);

    const dayOrders = mockOrders.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= start && d <= end;
    });
    const dayExpenses = mockExpenses.filter((e) => {
      const d = new Date(e.createdAt);
      return d >= start && d <= end;
    });

    const grossSales = dayOrders
      .filter((o) => o.total > 0)
      .reduce((s, o) => s + o.total, 0);
    const totalRefunds = Math.abs(
      dayOrders.filter((o) => o.total < 0).reduce((s, o) => s + o.total, 0),
    );
    const totalExpensesAmt = dayExpenses.reduce((s, e) => s + e.amount, 0);
    const netRevenue = grossSales - totalRefunds;

    return {
      success: true,
      data: {
        date: dateStr,
        grossSales,
        totalRefunds,
        netRevenue,
        grossCOGS: 0,
        refundedCOGS: 0,
        netCOGS: 0,
        totalExpenses: totalExpensesAmt,
        expectedDrawerCash: netRevenue - totalExpensesAmt,
        netProfit: netRevenue - totalExpensesAmt,
        expensesList: dayExpenses,
      },
    };
  },

  getMonthlyReport: async (year, month) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailySalesTrend = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      netRevenue: 0,
      netProfit: 0,
    }));

    return {
      success: true,
      data: {
        year,
        month,
        monthlyGrossSales: 0,
        monthlyTotalRefunds: 0,
        monthlyNetRevenue: 0,
        monthlyGrossCOGS: 0,
        monthlyRefundedCOGS: 0,
        monthlyNetCOGS: 0,
        monthlyExpenses: 0,
        monthlyNetProfit: 0,
        dailySalesTrend,
        topSellingProducts: [],
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
