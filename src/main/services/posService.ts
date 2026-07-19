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
  async function generateInvoiceNumber(tx: any, date: Date): Promise<string> {
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const datePrefix = `${yy}${mm}${dd}`;

    const yyyy = date.getFullYear();
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const { start, end } = dayBounds(dateStr);

    const lastOrder = await tx.order.findFirst({
      where: {
        createdAt: { gte: start, lte: end },
        invoiceNumber: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });

    let sequence = 1;
    if (lastOrder && lastOrder.invoiceNumber) {
      const parts = lastOrder.invoiceNumber.split('-');
      if (parts.length === 2) {
        const lastSequence = parseInt(parts[1], 10);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }
    }

    return `${datePrefix}-${String(sequence).padStart(3, '0')}`;
  }

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
    // Hide archived products from inventory/cashier lookups
    if (!product || product.isArchived) return null;

    return {
      ...product,
      createdAt: serialiseDate(product.createdAt),
      updatedAt: serialiseDate(product.updatedAt),
    };
  }

  /**
   * Soft-delete: mark the product as archived instead of
   * physically removing the row. This preserves:
   *   - Foreign key integrity on OrderItem.productId
   *   - Historical report accuracy (product name in top sellers, etc.)
   */
  async function deleteProduct(id: string): Promise<void> {
    await prisma.product.update({
      where: { id },
      data: { isArchived: true },
    });
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
      where: { isArchived: false },
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
        isArchived: false,
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
      const invoiceNumber = await generateInvoiceNumber(tx, new Date());

      // 1. Create the Order header.
      const order = await tx.order.create({
        data: {
          receiptNumber: orderData.receiptNumber,
          invoiceNumber,
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
    searchTerm: string,
  ): Promise<OrderWithItemsRecord | null> {
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { invoiceNumber: searchTerm },
          { id: searchTerm },
          { receiptNumber: searchTerm },
        ],
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) return null;

    return {
      ...order,
      invoiceNumber: order.invoiceNumber,
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
   *   2. Increment returnedQuantity on the original OrderItem.
   *   3. Restore the product stock by qtyToReturn.
   *   4. CREATE a new adjustment Order dated TODAY with a negative
   *      total so it appears in today's daily report.
   *
   * This "double-entry" approach keeps the original order immutable
   * and records the financial deduction under today's date.
   */
  async function refundItem(
    orderItemId: string,
    qtyToReturn: number,
  ): Promise<OrderRecord> {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch the original order item + its parent order
      const orderItem = await tx.orderItem.findUnique({
        where: { id: orderItemId },
        include: { product: true, order: true },
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

      // 2. Increment returnedQuantity on the original item
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { returnedQuantity: { increment: qtyToReturn } },
      });

      // 3. Restore stock
      await tx.product.update({
        where: { id: orderItem.productId },
        data: { stock: { increment: qtyToReturn } },
      });

      // 4. Create a NEW adjustment Order dated TODAY
      const orderSubtotal = orderItem.order.subTotal;
      const orderDiscount = orderItem.order.discountValue;
      const discountRatio = orderSubtotal > 0 ? (orderDiscount / orderSubtotal) : 0;
      const effectivePrice = Math.round(orderItem.priceAtSale * (1 - discountRatio));

      const refundTotal = -(qtyToReturn * effectivePrice);
      const refundReceipt = `RET-${orderItem.order.receiptNumber}-${Date.now()}`;
      const invoiceNumber = await generateInvoiceNumber(tx, new Date());

      const adjustmentOrder = await tx.order.create({
        data: {
          receiptNumber: refundReceipt,
          invoiceNumber,
          subTotal: refundTotal,
          discountValue: 0,
          offerName: null,
          total: refundTotal,
          type: 'RETURN',
          createdAt: new Date(),
          items: {
            create: {
              productId: orderItem.productId,
              quantity: -qtyToReturn,
              costAtSale: orderItem.costAtSale,
              priceAtSale: effectivePrice,
              returnedQuantity: 0,
            },
          },
        },
        include: { items: true },
      });

      return {
        ...adjustmentOrder,
        createdAt: serialiseDate(adjustmentOrder.createdAt),
        items: adjustmentOrder.items.map((item) => ({
          ...item,
          returnedQuantity: item.returnedQuantity,
        })),
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
   *   5. CREATE a new adjustment Order dated TODAY with:
   *      - A negative OrderItem for the returned product.
   *      - A positive OrderItem for the new product.
   *      - Total = net price difference (can be +, −, or 0).
   *
   * This "double-entry" approach keeps the original order immutable
   * and records the net financial impact under today's date.
   */
  async function exchangeItem(
    orderItemId: string,
    qtyToExchange: number,
    newProductSku: string,
    customPrice?: number,
  ): Promise<OrderRecord> {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch old order item + its parent order
      const oldItem = await tx.orderItem.findUnique({
        where: { id: orderItemId },
        include: { product: true, order: true },
      });

      if (!oldItem) {
        throw new Error(`Order item not found: ${orderItemId}`);
      }

      if (qtyToExchange <= 0) {
        throw new Error('Quantity to exchange must be greater than 0.');
      }

      // 2. Validate quantity to exchange
      const remainingQty = oldItem.quantity - oldItem.returnedQuantity;
      if (qtyToExchange > remainingQty) {
        throw new Error(
          `Cannot exchange ${qtyToExchange}. Only ${remainingQty} remaining.`,
        );
      }

      // 3. Find the NEW product
      const newProduct = await tx.product.findUnique({
        where: { sku: newProductSku },
      });

      if (!newProduct) {
        throw new Error(`Product not found with SKU: ${newProductSku}`);
      }

      // Enforce oversell protection: cannot exchange if new item lacks stock.
      if (newProduct.stock < qtyToExchange) {
        throw new Error(`Insufficient stock for "${newProduct.name}"`);
      }

      // 4. Update OLD item + restore old product stock, deduct new product stock
      await tx.orderItem.update({
        where: { id: oldItem.id },
        data: { returnedQuantity: { increment: qtyToExchange } },
      });

      if (oldItem.product) {
        await tx.product.update({
          where: { id: oldItem.productId! },
          data: { stock: { increment: qtyToExchange } },
        });
      }

      await tx.product.update({
        where: { id: newProduct.id },
        data: { stock: { decrement: qtyToExchange } },
      });

      // 5. Create a NEW adjustment Order dated TODAY
      //    total = (value of new items) − (value of returned items)
      const orderSubtotal = oldItem.order.subTotal;
      const orderDiscount = oldItem.order.discountValue;
      const discountRatio = orderSubtotal > 0 ? (orderDiscount / orderSubtotal) : 0;
      const effectiveOldPrice = Math.round(oldItem.priceAtSale * (1 - discountRatio));

      const returnedValue = qtyToExchange * effectiveOldPrice;
      const actualNewPrice = customPrice !== undefined && customPrice !== null ? customPrice : newProduct.sellingPrice;
      const newValue = qtyToExchange * actualNewPrice;
      const netDifference = newValue - returnedValue;

      const exchangeReceipt = `EX-${Math.floor(100000 + Math.random() * 900000)}`;
      const orderType = netDifference >= 0 ? 'SALE' : 'RETURN';
      const invoiceNumber = await generateInvoiceNumber(tx, new Date());

      const adjustmentOrder = await tx.order.create({
        data: {
          receiptNumber: exchangeReceipt,
          invoiceNumber,
          subTotal: netDifference,
          discountValue: 0,
          offerName: null,
          total: netDifference,
          type: orderType,
          createdAt: new Date(),
          items: {
            create: [
              // Negative line: the returned product
              {
                productId: oldItem.productId!,
                quantity: -qtyToExchange,
                costAtSale: oldItem.costAtSale,
                priceAtSale: effectiveOldPrice,
                returnedQuantity: 0,
              },
              // Positive line: the new product
              {
                productId: newProduct.id,
                quantity: qtyToExchange,
                costAtSale: newProduct.costPrice,
                priceAtSale: actualNewPrice,
                returnedQuantity: 0,
              },
            ],
          },
        },
        include: { items: true },
      });

      return {
        ...adjustmentOrder,
        createdAt: serialiseDate(adjustmentOrder.createdAt),
        items: adjustmentOrder.items.map((item) => ({
          ...item,
          returnedQuantity: item.returnedQuantity,
        })),
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
   *   Gross COGS        = SUM(quantity × costAtSale) for positive-quantity items
   *   Refunded COGS     = ABS(SUM(quantity × costAtSale)) for negative-quantity items
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
    // Fetch ALL order items from orders created within the date
    // range. With the double-entry model:
    //   - Positive-quantity items (from SALE orders) → grossCOGS
    //   - Negative-quantity items (from RETURN/adjustment orders) → refundedCOGS
    // This correctly captures cost recovery from refunds and
    // the net cost impact of exchanges.
    const allOrderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          ...dateFilter,
        },
      },
      select: {
        quantity: true,
        costAtSale: true,
      },
    });

    let grossCOGS = 0;
    let refundedCOGS = 0;

    for (const item of allOrderItems) {
      const costContribution = item.quantity * item.costAtSale;
      if (costContribution >= 0) {
        // Positive quantity: goods sold → adds to COGS
        grossCOGS += costContribution;
      } else {
        // Negative quantity: goods returned → recovers COGS
        refundedCOGS += Math.abs(costContribution);
      }
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
    // Fetch ALL order items within the month (including items
    // from adjustment orders) to compute net quantities sold.
    // Positive-qty items add to the count, negative-qty items
    // (from refund/exchange adjustments) subtract from it.
    const soldItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: start, lte: end },
        },
      },
      select: {
        quantity: true,
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

      if (existing) {
        existing.netQuantitySold += item.quantity;
      } else {
        productMap.set(key, {
          name: item.product.name,
          color: item.product.color,
          size: item.product.size,
          netQuantitySold: item.quantity,
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
