// ─────────────────────────────────────────────
// Shared types for the POS IPC boundary.
// These mirror the Prisma schema shapes but are
// decoupled so the renderer never imports Prisma directly.
// ─────────────────────────────────────────────

// ── Product ──────────────────────────────────

export interface AddProductInput {
  sku: string;
  name: string;
  category: string;
  color?: string | null;
  size?: string | null;
  costPrice: number;
  sellingPrice: number;
  stock?: number;
}

export interface ProductRecord {
  id: string;
  sku: string;
  name: string;
  category: string;
  color: string | null;
  size: string | null;
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
  returnedQuantity: number;
  product?: ProductRecord | null;
}

// Used by getOrderByReceipt — includes full product info on each item
export interface OrderWithItemsRecord {
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

// ── Expense ──────────────────────────────────

export interface AddExpenseInput {
  category: string;
  description: string;
  amount: number;
}

export interface ExpenseRecord {
  id: string;
  category: string;
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

// ── Reports (Accounting Engine) ──────────────

export interface DailyReport {
  date: string;
  grossSales: number;
  totalRefunds: number;
  netRevenue: number;
  grossCOGS: number;
  refundedCOGS: number;
  netCOGS: number;
  totalExpenses: number;
  expectedDrawerCash: number;
  netProfit: number;
  expensesList: ExpenseRecord[];
}

export interface DailySalesTrend {
  day: number;
  netRevenue: number;
  netProfit: number;
}

export interface TopSellingProduct {
  name: string;
  color: string | null;
  size: string | null;
  netQuantitySold: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  monthlyGrossSales: number;
  monthlyTotalRefunds: number;
  monthlyNetRevenue: number;
  monthlyGrossCOGS: number;
  monthlyRefundedCOGS: number;
  monthlyNetCOGS: number;
  monthlyExpenses: number;
  monthlyNetProfit: number;
  dailySalesTrend: DailySalesTrend[];
  topSellingProducts: TopSellingProduct[];
}
