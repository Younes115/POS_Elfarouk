// ─────────────────────────────────────────────
// POS Service — Core business logic layer.
// All database operations go through this module.
// The renderer never touches Prisma; it calls
// IPC handlers which delegate here.
// ─────────────────────────────────────────────

import type { PrismaClient } from '@prisma/client';
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
  DailySalesTrend,
  TopSellingProduct,
} from '../types.js';

// ── Helpers ──────────────────────────────────

/**
 * Serialise a Prisma Date to an ISO string so it
 * survives the IPC structured-clone boundary cleanly.
 */
function serialiseDate(d: Date): string {
  return d.toISOString();
}

/**
 * Return the start-of-day and end-of-day Date boundaries
 * for a given YYYY-MM-DD string, in the local timezone.
 */
function dayBounds(dateStr: string): { start: Date; end: Date } {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);

  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Return the start-of-month and end-of-month Date boundaries
 * for a given year and month (1-indexed), in the local timezone.
 */
function monthBounds(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  // Day 0 of the *next* month = last day of *this* month
  const lastDay = new Date(year, month, 0).getDate();
  const end = new Date(year, month - 1, lastDay, 23, 59, 59, 999);
  return { start, end };
}

function toExpenseRecord(
  expense: {
    id: string;
    description: string;
    amount: number;
    createdAt: Date;
    category?: string;
  },
  fallbackCategory = '',
): ExpenseRecord {
  return {
    id: expense.id,
    category: expense.category ?? fallbackCategory,
    description: expense.description,
    amount: expense.amount,
    createdAt: serialiseDate(expense.createdAt),
  };
}

// ── Service Factory ──────────────────────────

export function createPosService(prisma: PrismaClient) {
  // ── Product ────────────────────────────────

  async function addProduct(data: AddProductInput): Promise<ProductRecord> {
    const product = await prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        category: data.category,
        color: data.color ?? null,
        size: data.size ?? null,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        stock: data.stock ?? 0,
      },
    });

    return {
      ...product,
      createdAt: serialiseDate(product.createdAt),
      updatedAt: serialiseDate(product.updatedAt),
    };
  }

  async function addBulkProducts(productsData: AddProductInput[]): Promise<void> {
    const data = productsData.map(p => ({
      sku: p.sku,
      name: p.name,
      category: p.category,
      color: p.color ?? null,
      size: p.size ?? null,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      stock: p.stock ?? 0,
    }));
    await prisma.product.createMany({ data });
  }

  async function getProductBySku(sku: string): Promise<ProductRecord | null> {
    const product = await prisma.product.findUnique({ where: { sku } });
    if (!product) return null;

    return {
      ...product,
      createdAt: serialiseDate(product.createdAt),
      updatedAt: serialiseDate(product.updatedAt),
    };
  }

  async function deleteProduct(id: string) {
    return prisma.product.delete({ where: { id } });
  }

  async function updateProduct(
    id: string,
    data: Partial<Omit<AddProductInput, 'sku'>>,
  ): Promise<ProductRecord> {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.color !== undefined && { color: data.color ?? null }),
        ...(data.size !== undefined && { size: data.size ?? null }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice }),
        ...(data.stock !== undefined && { stock: data.stock }),
      },
    });

    return {
      ...product,
      createdAt: serialiseDate(product.createdAt),
      updatedAt: serialiseDate(product.updatedAt),
    };
  }

  async function getAllProducts(): Promise<ProductRecord[]> {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p) => ({
      ...p,
      createdAt: serialiseDate(p.createdAt),
      updatedAt: serialiseDate(p.updatedAt),
    }));
  }

  async function searchProducts(query: string): Promise<ProductRecord[]> {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { sku: { contains: query } },
          { name: { contains: query } },
        ],
      },
      take: 10,
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({
      ...p,
      createdAt: serialiseDate(p.createdAt),
      updatedAt: serialiseDate(p.updatedAt),
    }));
  }

  // ── Order (transactional) ──────────────────

  /**
   * Create an Order + its OrderItems and adjust Product stock,
   * all inside a single Prisma interactive transaction.
   *
   * Stock logic:
   *   SALE  → item.quantity is positive → stock DECREASES by quantity
   *   RETURN → item.quantity is negative → stock INCREASES by |quantity|
   *
   * The decrement call uses `{ decrement: item.quantity }`.
   * When quantity is positive (sale) stock drops. When quantity is
   * negative (return) the double-negative causes stock to rise.
   * This means BOTH sale and return paths use the same single
   * Prisma update — no branching required.
   */
  async function createOrder(
    orderData: CreateOrderInput,
    items: CreateOrderItemInput[],
  ): Promise<OrderRecord> {
    // Edge Case: Enforce total >= 0 for SALES
    const calculatedTotal = orderData.type === 'RETURN' 
      ? orderData.total 
      : Math.max(0, orderData.subTotal - (orderData.discountValue ?? 0));

    return prisma.$transaction(async (tx) => {
      // 1. Create the Order header.
      const order = await tx.order.create({
        data: {
          receiptNumber: orderData.receiptNumber,
          subTotal: orderData.subTotal,
          discountValue: orderData.discountValue ?? 0,
          offerName: orderData.offerName ?? null,
          total: calculatedTotal,
          type: orderData.type ?? 'SALE',
        },
      });

      // 2. Create each OrderItem and adjust stock atomically.
      const createdItems = [];

      for (const item of items) {
        // Oversell protection: check current stock for SALE orders.
        if (item.quantity > 0) {
          const currentProduct = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true, name: true },
          });

          if (!currentProduct) {
            throw new Error(`Product not found: ${item.productId}`);
          }

          if (item.quantity > currentProduct.stock) {
            throw new Error(
              `Insufficient stock for product "${currentProduct.name}": ` +
              `requested ${item.quantity}, available ${currentProduct.stock}`
            );
          }
        }

        // Freeze cost & price at point-of-sale.
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            costAtSale: item.costAtSale,
            priceAtSale: item.priceAtSale,
          },
        });

        // Adjust stock. decrement by a negative value = increment.
        // This handles both SALE (+qty → stock down) and
        // RETURN (−qty → stock up) in one expression.
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        createdItems.push({
          ...orderItem,
        });
      }

      return {
        ...order,
        createdAt: serialiseDate(order.createdAt),
        items: createdItems,
      };
    });
  }

  // ── Returns & Exchanges ────────────────────

  /**
   * Fetch a complete order by its receipt number,
   * including all order items with nested product data.
   */
  async function getOrderByReceipt(
    receiptNumber: string,
  ): Promise<OrderWithItemsRecord | null> {
    const order = await prisma.order.findUnique({
      where: { receiptNumber },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) return null;

    return {
      ...order,
      createdAt: serialiseDate(order.createdAt),
      items: order.items.map((item) => ({
        ...item,
        returnedQuantity: item.returnedQuantity,
        product: item.product
          ? {
              ...item.product,
              createdAt: serialiseDate(item.product.createdAt),
              updatedAt: serialiseDate(item.product.updatedAt),
            }
          : null,
      })),
    };
  }

  /**
   * Refund (partially or fully) an order item.
   * Uses an interactive transaction to:
   *   1. Verify quantity bounds.
   *   2. Increment returnedQuantity.
   *   3. Restore the product stock by qtyToReturn.
   */
  async function refundItem(
    orderItemId: string,
    qtyToReturn: number,
  ): Promise<OrderItemRecord> {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch the order item
      const orderItem = await tx.orderItem.findUnique({
        where: { id: orderItemId },
        include: { product: true },
      });

      if (!orderItem) {
        throw new Error(`Order item not found: ${orderItemId}`);
      }

      if (qtyToReturn <= 0) {
        throw new Error('Quantity to return must be greater than 0.');
      }

      if (orderItem.returnedQuantity + qtyToReturn > orderItem.quantity) {
        throw new Error(
          `Cannot return ${qtyToReturn} — only ${orderItem.quantity - orderItem.returnedQuantity} remaining.`,
        );
      }

      if (!orderItem.productId) {
        throw new Error('Cannot refund: product has been deleted from catalog.');
      }

      // 2. Increment returnedQuantity
      const updated = await tx.orderItem.update({
        where: { id: orderItemId },
        data: { returnedQuantity: { increment: qtyToReturn } },
      });

      // 3. Restore stock
      await tx.product.update({
        where: { id: orderItem.productId },
        data: { stock: { increment: qtyToReturn } },
      });

      return {
        ...updated,
        returnedQuantity: updated.returnedQuantity,
      };
    });
  }

  /**
   * Exchange (partially or fully) an order item for a different product.
   * Uses an interactive transaction to:
   *   1. Verify quantity bounds on the old item.
   *   2. Verify new product exists and has enough stock.
   *   3. Increment old item's returnedQuantity, restore its stock.
   *   4. Decrement new product stock.
   *   5. Create a new OrderItem for the exchanged quantity.
   */
  async function exchangeItem(
    orderItemId: string,
    qtyToExchange: number,
    newProductSku: string,
  ): Promise<OrderItemRecord> {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch old order item
      const oldItem = await tx.orderItem.findUnique({
        where: { id: orderItemId },
        include: { product: true },
      });

      if (!oldItem) {
        throw new Error(`Order item not found: ${orderItemId}`);
      }

      if (qtyToExchange <= 0) {
        throw new Error('Quantity to exchange must be greater than 0.');
      }

      if (oldItem.returnedQuantity + qtyToExchange > oldItem.quantity) {
        throw new Error(
          `Cannot exchange ${qtyToExchange} — only ${oldItem.quantity - oldItem.returnedQuantity} remaining.`,
        );
      }

      if (!oldItem.productId) {
        throw new Error('Cannot exchange: original product has been deleted.');
      }

      // 2. Fetch new product by SKU
      const newProduct = await tx.product.findUnique({
        where: { sku: newProductSku },
      });

      if (!newProduct) {
        throw new Error(`New product not found with SKU: ${newProductSku}`);
      }

      if (newProduct.stock < qtyToExchange) {
        throw new Error(
          `Insufficient stock for "${newProduct.name}": ` +
          `need ${qtyToExchange}, available ${newProduct.stock}`,
        );
      }

      // 3. Increment returnedQuantity on old item and restore stock
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { returnedQuantity: { increment: qtyToExchange } },
      });

      await tx.product.update({
        where: { id: oldItem.productId },
        data: { stock: { increment: qtyToExchange } },
      });

      // 4. Decrement new product stock
      await tx.product.update({
        where: { id: newProduct.id },
        data: { stock: { decrement: qtyToExchange } },
      });

      // 5. Create replacement OrderItem with new product's current prices
      const newOrderItem = await tx.orderItem.create({
        data: {
          orderId: oldItem.orderId,
          productId: newProduct.id,
          quantity: qtyToExchange,
          costAtSale: newProduct.costPrice,
          priceAtSale: newProduct.sellingPrice,
          returnedQuantity: 0,
        },
        include: { product: true },
      });

      return {
        ...newOrderItem,
        returnedQuantity: newOrderItem.returnedQuantity,
        product: newOrderItem.product
          ? {
              ...newOrderItem.product,
              createdAt: serialiseDate(newOrderItem.product.createdAt),
              updatedAt: serialiseDate(newOrderItem.product.updatedAt),
            }
          : null,
      };
    });
  }

  // ── Expense ────────────────────────────────

  /**
   * Create a new expense with strict input validation.
   * Throws if amount ≤ 0 or category/description are empty.
   */
  async function createExpense(
    amount: number,
    category: string,
    description: string,
  ): Promise<ExpenseRecord> {
    if (amount <= 0) {
      throw new Error('Expense amount must be greater than 0.');
    }
    if (!category || category.trim() === '') {
      throw new Error('Expense category is required.');
    }
    if (!description || description.trim() === '') {
      throw new Error('Expense description is required.');
    }

    const expense = await prisma.expense.create({
      data: {
        category: category.trim(),
        description: description.trim(),
        amount,
      },
    });

    return toExpenseRecord(expense, category.trim());
  }

  async function addExpense(input: {
    amount: number;
    description: string;
    category?: string;
  }): Promise<ExpenseRecord> {
    return createExpense(
      input.amount,
      input.category ?? 'GENERAL',
      input.description,
    );
  }

  /**
   * Fetch all expenses for a specific calendar day.
   * Uses exact local-timezone boundaries to prevent
   * time-zone bleeding across days.
   */
  async function getDailyExpenses(dateStr: string): Promise<ExpenseRecord[]> {
    const { start, end } = dayBounds(dateStr);

    const expenses = await prisma.expense.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'desc' },
    });

    return expenses.map((expense) => toExpenseRecord(expense));
  }

  /**
   * Delete an expense by ID.
   * Throws if the expense does not exist (Prisma default).
   */
  async function deleteExpense(id: string): Promise<ExpenseRecord> {
    const expense = await prisma.expense.delete({ where: { id } });
    return toExpenseRecord(expense);
  }

  // ── Daily Summary ──────────────────────────

  /**
   * Compute the financial snapshot for a calendar day.
   *
   *   totalSales   = SUM(total) of Orders WHERE type = 'SALE'
   *   totalReturns = SUM(total) of Orders WHERE type = 'RETURN'
   *   totalExpenses = SUM(amount) of Expenses
   *   netCash      = totalSales − totalReturns − totalExpenses
   */
  async function getDailySummary(dateStr: string): Promise<DailySummary> {
    const { start, end } = dayBounds(dateStr);

    const dateFilter = { createdAt: { gte: start, lte: end } };

    const [salesAgg, returnAgg, expenseAgg, orderCount, returnCount] =
      await Promise.all([
        prisma.order.aggregate({
          where: { ...dateFilter, type: 'SALE' },
          _sum: { total: true },
        }),
        prisma.order.aggregate({
          where: { ...dateFilter, type: 'RETURN' },
          _sum: { total: true },
        }),
        prisma.expense.aggregate({
          where: dateFilter,
          _sum: { amount: true },
        }),
        prisma.order.count({
          where: { ...dateFilter, type: 'SALE' },
        }),
        prisma.order.count({
          where: { ...dateFilter, type: 'RETURN' },
        }),
      ]);

    const totalSales = salesAgg._sum.total ?? 0;
    const totalReturns = Math.abs(returnAgg._sum.total ?? 0);
    const totalExpenses = expenseAgg._sum.amount ?? 0;

    return {
      date: dateStr,
      totalSales,
      totalReturns,
      totalExpenses,
      netCash: totalSales - totalReturns - totalExpenses,
      orderCount,
      returnCount,
    };
  }

  // ── Reports (Accounting Engine) ────────────

  /**
   * Compute financials for a single date range.
   * This is the core calculation shared by both daily and monthly reports.
   *
   *   Gross Sales       = SUM(total) of positive-total Orders
   *   Total Refunds     = ABS(SUM(total)) of negative-total Orders
   *   Net Revenue       = Gross Sales − Total Refunds
   *   Gross COGS        = SUM((quantity − returnedQuantity) × costAtSale) for items in positive orders
   *   Refunded COGS     = SUM(returnedQuantity × costAtSale) for items in positive orders
   *   Net COGS          = Gross COGS − Refunded COGS
   *   Total Expenses    = SUM(amount) of Expenses
   *   Expected Drawer   = Net Revenue − Total Expenses
   *   Net Profit        = Net Revenue − Net COGS − Total Expenses
   */
  async function computeFinancials(start: Date, end: Date) {
    const dateFilter = { createdAt: { gte: start, lte: end } };

    // ── Revenue aggregates ─────────────────
    const [positiveOrdersAgg, negativeOrdersAgg, expenseAgg] =
      await Promise.all([
        // Gross Sales: orders with total > 0
        prisma.order.aggregate({
          where: { ...dateFilter, total: { gt: 0 } },
          _sum: { total: true },
        }),
        // Total Refunds: orders with total < 0
        prisma.order.aggregate({
          where: { ...dateFilter, total: { lt: 0 } },
          _sum: { total: true },
        }),
        // Total Expenses
        prisma.expense.aggregate({
          where: dateFilter,
          _sum: { amount: true },
        }),
      ]);

    const grossSales = positiveOrdersAgg._sum.total ?? 0;
    const totalRefunds = Math.abs(negativeOrdersAgg._sum.total ?? 0);
    const netRevenue = grossSales - totalRefunds;
    const totalExpenses = expenseAgg._sum.amount ?? 0;

    // ── COGS calculation ───────────────────
    // Fetch order items belonging to *positive-total* orders
    // created within the date range. We compute COGS from
    // the frozen costAtSale, quantity, and returnedQuantity.
    const positiveOrderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          ...dateFilter,
          total: { gt: 0 },
        },
      },
      select: {
        quantity: true,
        returnedQuantity: true,
        costAtSale: true,
      },
    });

    let grossCOGS = 0;
    let refundedCOGS = 0;

    for (const item of positiveOrderItems) {
      // Gross COGS: full quantity × cost (before returns)
      grossCOGS += item.quantity * item.costAtSale;
      // Refunded COGS: returned portion × cost
      refundedCOGS += item.returnedQuantity * item.costAtSale;
    }

    const netCOGS = grossCOGS - refundedCOGS;

    return {
      grossSales,
      totalRefunds,
      netRevenue,
      grossCOGS,
      refundedCOGS,
      netCOGS,
      totalExpenses,
      expectedDrawerCash: netRevenue - totalExpenses,
      netProfit: netRevenue - netCOGS - totalExpenses,
    };
  }

  /**
   * Full financial report for a single calendar day.
   * Returns all revenue, COGS, expenses, and profit metrics
   * plus the itemised list of expenses.
   */
  async function getDailyReport(dateStr: string): Promise<DailyReport> {
    const { start, end } = dayBounds(dateStr);

    const [financials, expensesList] = await Promise.all([
      computeFinancials(start, end),
      getDailyExpenses(dateStr),
    ]);

    return {
      date: dateStr,
      ...financials,
      expensesList,
    };
  }

  /**
   * Full financial report for an entire calendar month.
   * Includes aggregate totals, a daily sales trend array
   * (one entry per day — ideal for charts), and the top 5
   * best-selling products grouped by Name + Color + Size.
   */
  async function getMonthlyReport(
    year: number,
    month: number,
  ): Promise<MonthlyReport> {
    const { start, end } = monthBounds(year, month);

    // ── Monthly aggregates ─────────────────
    const financials = await computeFinancials(start, end);

    // ── Daily sales trend ──────────────────
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailySalesTrend: DailySalesTrend[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const { start: dayStart, end: dayEnd } = dayBounds(dayStr);
      const dayFinancials = await computeFinancials(dayStart, dayEnd);

      dailySalesTrend.push({
        day,
        netRevenue: dayFinancials.netRevenue,
        netProfit: dayFinancials.netProfit,
      });
    }

    // ── Top selling products ───────────────
    // Fetch all order items from positive orders within the month,
    // including product details for grouping.
    const soldItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          total: { gt: 0 },
        },
      },
      select: {
        quantity: true,
        returnedQuantity: true,
        product: {
          select: {
            name: true,
            color: true,
            size: true,
          },
        },
      },
    });

    // Group by Name + Color + Size and sum net quantities
    const productMap = new Map<string, TopSellingProduct>();

    for (const item of soldItems) {
      // Skip items whose product was deleted
      if (!item.product) continue;

      const key = `${item.product.name}||${item.product.color ?? ''}||${item.product.size ?? ''}`;
      const existing = productMap.get(key);
      const netQty = item.quantity - item.returnedQuantity;

      if (existing) {
        existing.netQuantitySold += netQty;
      } else {
        productMap.set(key, {
          name: item.product.name,
          color: item.product.color,
          size: item.product.size,
          netQuantitySold: netQty,
        });
      }
    }

    const topSellingProducts = [...productMap.values()]
      .filter((p) => p.netQuantitySold > 0)
      .sort((a, b) => b.netQuantitySold - a.netQuantitySold)
      .slice(0, 5);

    return {
      year,
      month,
      monthlyGrossSales: financials.grossSales,
      monthlyTotalRefunds: financials.totalRefunds,
      monthlyNetRevenue: financials.netRevenue,
      monthlyGrossCOGS: financials.grossCOGS,
      monthlyRefundedCOGS: financials.refundedCOGS,
      monthlyNetCOGS: financials.netCOGS,
      monthlyExpenses: financials.totalExpenses,
      monthlyNetProfit: financials.netProfit,
      dailySalesTrend,
      topSellingProducts,
    };
  }

  // ── Public API ─────────────────────────────

  return {
    addProduct,
    addBulkProducts,
    getProductBySku,
    deleteProduct,
    updateProduct,
    getAllProducts,
    searchProducts,
    createOrder,
    getOrderByReceipt,
    refundItem,
    exchangeItem,
    createExpense,
    addExpense,
    getDailyExpenses,
    deleteExpense,
    getDailySummary,
    getDailyReport,
    getMonthlyReport,
  } as const;
}

export type PosService = ReturnType<typeof createPosService>;
