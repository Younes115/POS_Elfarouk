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
  AddExpenseInput,
  ExpenseRecord,
  DailySummary,
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

  async function getProductBySku(sku: string): Promise<ProductRecord | null> {
    const product = await prisma.product.findUnique({ where: { sku } });
    if (!product) return null;

    return {
      ...product,
      createdAt: serialiseDate(product.createdAt),
      updatedAt: serialiseDate(product.updatedAt),
    };
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

  // ── Expense ────────────────────────────────

  async function addExpense(data: AddExpenseInput): Promise<ExpenseRecord> {
    const expense = await prisma.expense.create({
      data: {
        description: data.description,
        amount: data.amount,
      },
    });

    return {
      ...expense,
      createdAt: serialiseDate(expense.createdAt),
    };
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

  // ── Public API ─────────────────────────────

  return {
    addProduct,
    getProductBySku,
    createOrder,
    addExpense,
    getDailySummary,
  } as const;
}

export type PosService = ReturnType<typeof createPosService>;
