import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { setupTestEnvironment } from './testUtils.js';

const { prisma, service, init, cleanup } = setupTestEnvironment('test_summary.db');

beforeAll(() => {
  init();
}, 30_000);

beforeEach(async () => {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.product.deleteMany();
});

afterAll(async () => {
  await cleanup();
});

describe('Daily Summary API', () => {
  it('Standard: Verify netCash with mixed sales, returns, and expenses', async () => {
    // Arrange
    const product = await service.addProduct({
      sku: 'SUM-ITEM',
      name: 'Summary Item',
      category: 'SNEAKERS',
      color: 'Black',
      size: '42',
      costPrice: 100,
      sellingPrice: 500,
      stock: 100,
    });

    const today = new Date().toISOString().split('T')[0];

    // Sale: 1000
    await service.createOrder(
      { receiptNumber: 'SUM-1', subTotal: 1000, total: 1000, type: 'SALE' },
      [{ productId: product.id, quantity: 2, costAtSale: 100, priceAtSale: 500 }]
    );

    // Return: -500
    await service.createOrder(
      { receiptNumber: 'SUM-2', subTotal: -500, total: -500, type: 'RETURN' },
      [{ productId: product.id, quantity: -1, costAtSale: 100, priceAtSale: 500 }]
    );

    // Expense: 100
    await service.addExpense({ description: 'Utilities', amount: 100 });

    // Act
    const summary = await service.getDailySummary(today);

    // Assert
    // netCash = 1000 (Sales) - 500 (Returns Math.abs) - 100 (Expenses) = 400
    expect(summary.totalSales).toBe(1000);
    expect(summary.totalReturns).toBe(500); // Converted to absolute positive
    expect(summary.totalExpenses).toBe(100);
    expect(summary.netCash).toBe(400);
    expect(summary.orderCount).toBe(1);
    expect(summary.returnCount).toBe(1);
  });

  it('Edge Case: Fetch getDailySummary for a day with ZERO transactions safely returns 0', async () => {
    // Arrange - Empty database for a specific old date
    const emptyDate = '2000-01-01';

    // Act
    const summary = await service.getDailySummary(emptyDate);

    // Assert
    expect(summary.totalSales).toBe(0);
    expect(summary.totalReturns).toBe(0);
    expect(summary.totalExpenses).toBe(0);
    expect(summary.netCash).toBe(0);
    expect(summary.orderCount).toBe(0);
    expect(summary.returnCount).toBe(0);
  });
});
