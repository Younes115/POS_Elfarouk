// ─────────────────────────────────────────────
// Shared types for the POS IPC boundary.
// These mirror the Prisma schema shapes but are
// decoupled so the renderer never imports Prisma directly.
// ─────────────────────────────────────────────

// ── Product ──────────────────────────────────

export interface AddProductInput {
  sku: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  stock?: number;
}

export interface ProductRecord {
  id: string;
  sku: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

// ── Order ────────────────────────────────────

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  costAtSale: number;
  priceAtSale: number;
}

export interface CreateOrderInput {
  receiptNumber: string;
  subTotal: number;
  discountValue?: number;
  offerName?: string | null;
  total: number;
  type?: 'SALE' | 'RETURN';
}

export interface OrderRecord {
  id: string;
  receiptNumber: string;
  subTotal: number;
  discountValue: number;
  offerName: string | null;
  total: number;
  type: string;
  createdAt: string;
  items: OrderItemRecord[];
}

export interface OrderItemRecord {
  id: string;
  orderId: string;
  productId: string | null;
  quantity: number;
  costAtSale: number;
  priceAtSale: number;
}

// ── Expense ──────────────────────────────────

export interface AddExpenseInput {
  description: string;
  amount: number;
}

export interface ExpenseRecord {
  id: string;
  description: string;
  amount: number;
  createdAt: string;
}

// ── Daily Summary ────────────────────────────

export interface DailySummary {
  date: string;
  totalSales: number;
  totalReturns: number;
  totalExpenses: number;
  netCash: number;
  orderCount: number;
  returnCount: number;
}
