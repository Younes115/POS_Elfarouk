// ─────────────────────────────────────────────
// Integration Tests — Accounting & Reports Engine
// Tests getDailyReport and getMonthlyReport with
// real Prisma calls against an isolated SQLite DB.
// ─────────────────────────────────────────────

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { setupTestEnvironment } from './testUtils.js';

const { prisma, service, init, cleanup } = setupTestEnvironment('test_reports.db');

// ── Setup & Teardown ─────────────────────────

beforeAll(() => {
  init();
}, 30_000);

beforeEach(async () => {
  // Clear all tables in dependency order for full isolation
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.product.deleteMany();
});

afterAll(async () => {
  await cleanup();
});

// ── Helpers ──────────────────────────────────

/** Create a product and return its full record. */
async function seedProduct(overrides: {
  sku: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  color?: string;
  size?: string;
}) {
  return service.addProduct({
    category: 'SNEAKERS',
    color: overrides.color ?? 'Black',
    size: overrides.size ?? '42',
    ...overrides,
  });
}

/**
 * Create an order + items directly via Prisma so we can
 * set an explicit `createdAt` timestamp for boundary tests.
 * The service's createOrder always uses `now()`.
 */
async function seedOrderAtTime(opts: {
  receiptNumber: string;
  total: number;
  createdAt: Date;
  type?: string;
  items: {
    productId: string;
    quantity: number;
    costAtSale: number;
    priceAtSale: number;
    returnedQuantity?: number;
  }[];
}) {
  return prisma.order.create({
    data: {
      receiptNumber: opts.receiptNumber,
      subTotal: opts.total,
      discountValue: 0,
      total: opts.total,
      type: opts.type ?? 'SALE',
      createdAt: opts.createdAt,
      items: {
        create: opts.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          costAtSale: item.costAtSale,
          priceAtSale: item.priceAtSale,
          returnedQuantity: item.returnedQuantity ?? 0,
        })),
      },
    },
    include: { items: true },
  });
}

// ═════════════════════════════════════════════
//  getDailyReport
// ═════════════════════════════════════════════

describe('getDailyReport', () => {
  // ── Scenario 1: Standard Day ────────────

  it('Scenario 1: Standard day with sales and expenses → positive profit', async () => {
    // ARRANGE
    // Product: Cost 100, Price 200
    const product = await seedProduct({
      sku: 'RPT-STD-1',
      name: 'Standard Shoe',
      costPrice: 100,
      sellingPrice: 200,
      stock: 50,
    });

    const testDate = new Date('2026-07-15T12:00:00.000');

    // Sale order: 2 items × 200 = Gross 400, COGS = 2 × 100 = 200
    await seedOrderAtTime({
      receiptNumber: 'RPT-SALE-1',
      total: 400,
      createdAt: testDate,
      type: 'SALE',
      items: [
        {
          productId: product.id,
          quantity: 2,
          costAtSale: 100,
          priceAtSale: 200,
        },
      ],
    });

    // Expense: 50
    await prisma.expense.create({
      data: {
        category: 'UTILITIES',
        description: 'Electricity bill',
        amount: 50,
        createdAt: testDate,
      },
    });

    // ACT
    const report = await service.getDailyReport('2026-07-15');

    // ASSERT
    expect(report.grossSales).toBe(400);
    expect(report.totalRefunds).toBe(0);
    expect(report.netRevenue).toBe(400);           // 400 - 0
    expect(report.grossCOGS).toBe(200);             // 2 × 100
    expect(report.refundedCOGS).toBe(0);
    expect(report.netCOGS).toBe(200);               // 200 - 0
    expect(report.totalExpenses).toBe(50);
    expect(report.expectedDrawerCash).toBe(350);    // 400 - 50
    expect(report.netProfit).toBe(150);              // 400 - 200 - 50
    expect(report.expensesList).toHaveLength(1);
    expect(report.expensesList[0].category).toBe('UTILITIES');
    expect(report.expensesList[0].amount).toBe(50);
  });

  // ── Scenario 2: Day with Refunds ───────

  it('Scenario 2: Day with refunds → negative orders deducted correctly', async () => {
    // ARRANGE
    const product = await seedProduct({
      sku: 'RPT-REF-1',
      name: 'Refund Shoe',
      costPrice: 80,
      sellingPrice: 200,
      stock: 50,
    });

    const testDate = new Date('2026-07-15T10:00:00.000');

    // Positive sale: 3 items × 200 = 600, COGS = 3 × 80 = 240
    // 1 item already returned → returnedQuantity = 1
    await seedOrderAtTime({
      receiptNumber: 'RPT-MIX-1',
      total: 600,
      createdAt: testDate,
      type: 'SALE',
      items: [
        {
          productId: product.id,
          quantity: 3,
          costAtSale: 80,
          priceAtSale: 200,
          returnedQuantity: 1,
        },
      ],
    });

    // Refund order: negative total = -200 (1 item returned blind)
    await seedOrderAtTime({
      receiptNumber: 'RPT-MIX-2',
      total: -200,
      createdAt: testDate,
      type: 'RETURN',
      items: [
        {
          productId: product.id,
          quantity: -1,
          costAtSale: 80,
          priceAtSale: 200,
        },
      ],
    });

    // ACT
    const report = await service.getDailyReport('2026-07-15');

    // ASSERT
    // Gross Sales = 600 (only positive-total orders)
    expect(report.grossSales).toBe(600);
    // Total Refunds = abs(-200) = 200
    expect(report.totalRefunds).toBe(200);
    // Net Revenue = 600 - 200 = 400
    expect(report.netRevenue).toBe(400);
    // Gross COGS = 3 × 80 = 240 (from positive order only)
    expect(report.grossCOGS).toBe(240);
    // Refunded COGS = 1 × 80 = 80 (returnedQuantity on positive order)
    expect(report.refundedCOGS).toBe(80);
    // Net COGS = 240 - 80 = 160
    expect(report.netCOGS).toBe(160);
    expect(report.totalExpenses).toBe(0);
    // Expected Drawer Cash = 400 - 0 = 400
    expect(report.expectedDrawerCash).toBe(400);
    // Net Profit = 400 - 160 - 0 = 240
    expect(report.netProfit).toBe(240);
  });

  // ── Scenario 3: Empty Day ──────────────

  it('Scenario 3: Empty day → all metrics are zero', async () => {
    // ARRANGE — no records created for this date

    // ACT
    const report = await service.getDailyReport('2026-07-16');

    // ASSERT
    expect(report.date).toBe('2026-07-16');
    expect(report.grossSales).toBe(0);
    expect(report.totalRefunds).toBe(0);
    expect(report.netRevenue).toBe(0);
    expect(report.grossCOGS).toBe(0);
    expect(report.refundedCOGS).toBe(0);
    expect(report.netCOGS).toBe(0);
    expect(report.totalExpenses).toBe(0);
    expect(report.expectedDrawerCash).toBe(0);
    expect(report.netProfit).toBe(0);
    expect(report.expensesList).toEqual([]);
  });

  // ── Scenario 4: Timezone Boundary ──────

  it('Scenario 4: Order at 23:59:59 included, 00:00:01 next day excluded', async () => {
    // ARRANGE
    const product = await seedProduct({
      sku: 'RPT-BNDRY-1',
      name: 'Boundary Shoe',
      costPrice: 50,
      sellingPrice: 150,
      stock: 50,
    });

    // Order at the very end of Day 1: 2026-07-20 23:59:59
    const endOfDay1 = new Date('2026-07-20T23:59:59.000');
    await seedOrderAtTime({
      receiptNumber: 'RPT-DAY1-LATE',
      total: 150,
      createdAt: endOfDay1,
      type: 'SALE',
      items: [
        {
          productId: product.id,
          quantity: 1,
          costAtSale: 50,
          priceAtSale: 150,
        },
      ],
    });

    // Order at the very start of Day 2: 2026-07-21 00:00:01
    const startOfDay2 = new Date('2026-07-21T00:00:01.000');
    await seedOrderAtTime({
      receiptNumber: 'RPT-DAY2-EARLY',
      total: 300,
      createdAt: startOfDay2,
      type: 'SALE',
      items: [
        {
          productId: product.id,
          quantity: 2,
          costAtSale: 50,
          priceAtSale: 150,
        },
      ],
    });

    // ACT — query Day 1 only
    const reportDay1 = await service.getDailyReport('2026-07-20');

    // ASSERT
    // Must include ONLY the Day 1 order (150), NOT the Day 2 order (300)
    expect(reportDay1.grossSales).toBe(150);
    expect(reportDay1.netRevenue).toBe(150);
    expect(reportDay1.grossCOGS).toBe(50);
    expect(reportDay1.netProfit).toBe(100); // 150 - 50 - 0

    // Double-check Day 2 has the other order
    const reportDay2 = await service.getDailyReport('2026-07-21');
    expect(reportDay2.grossSales).toBe(300);
    expect(reportDay2.netRevenue).toBe(300);
  });
});

// ═════════════════════════════════════════════
//  getMonthlyReport
// ═════════════════════════════════════════════

describe('getMonthlyReport', () => {
  // ── Scenario 1: Multi-day Aggregation ──

  it('Scenario 1: Aggregation across multiple days within the month', async () => {
    // ARRANGE
    const product = await seedProduct({
      sku: 'RPT-MONTH-1',
      name: 'Monthly Shoe',
      costPrice: 60,
      sellingPrice: 200,
      stock: 100,
    });

    // Day 1 (July 1): Sale 200
    await seedOrderAtTime({
      receiptNumber: 'RPT-M-JUL01',
      total: 200,
      createdAt: new Date('2026-07-01T10:00:00.000'),
      items: [
        { productId: product.id, quantity: 1, costAtSale: 60, priceAtSale: 200 },
      ],
    });

    // Day 15 (July 15): Sale 400
    await seedOrderAtTime({
      receiptNumber: 'RPT-M-JUL15',
      total: 400,
      createdAt: new Date('2026-07-15T14:30:00.000'),
      items: [
        { productId: product.id, quantity: 2, costAtSale: 60, priceAtSale: 200 },
      ],
    });

    // Day 31 (July 31): Sale 600
    await seedOrderAtTime({
      receiptNumber: 'RPT-M-JUL31',
      total: 600,
      createdAt: new Date('2026-07-31T18:00:00.000'),
      items: [
        { productId: product.id, quantity: 3, costAtSale: 60, priceAtSale: 200 },
      ],
    });

    // Expense on July 15: 100
    await prisma.expense.create({
      data: {
        category: 'RENT',
        description: 'Monthly rent',
        amount: 100,
        createdAt: new Date('2026-07-15T09:00:00.000'),
      },
    });

    // ACT
    const report = await service.getMonthlyReport(2026, 7);

    // ASSERT — Monthly aggregates
    // Gross Sales = 200 + 400 + 600 = 1200
    expect(report.monthlyGrossSales).toBe(1200);
    expect(report.monthlyTotalRefunds).toBe(0);
    // Net Revenue = 1200 - 0 = 1200
    expect(report.monthlyNetRevenue).toBe(1200);
    // Gross COGS = (1×60) + (2×60) + (3×60) = 60 + 120 + 180 = 360
    expect(report.monthlyGrossCOGS).toBe(360);
    expect(report.monthlyRefundedCOGS).toBe(0);
    expect(report.monthlyNetCOGS).toBe(360);
    expect(report.monthlyExpenses).toBe(100);
    // Net Profit = 1200 - 360 - 100 = 740
    expect(report.monthlyNetProfit).toBe(740);

    // ASSERT — Daily sales trend
    // July has 31 days
    expect(report.dailySalesTrend).toHaveLength(31);

    // Day 1: netRevenue = 200, netProfit = 200 - 60 - 0 = 140
    const day1 = report.dailySalesTrend.find((d) => d.day === 1)!;
    expect(day1.netRevenue).toBe(200);
    expect(day1.netProfit).toBe(140);

    // Day 15: netRevenue = 400, netProfit = 400 - 120 - 100 = 180
    const day15 = report.dailySalesTrend.find((d) => d.day === 15)!;
    expect(day15.netRevenue).toBe(400);
    expect(day15.netProfit).toBe(180);

    // Day 31: netRevenue = 600, netProfit = 600 - 180 - 0 = 420
    const day31 = report.dailySalesTrend.find((d) => d.day === 31)!;
    expect(day31.netRevenue).toBe(600);
    expect(day31.netProfit).toBe(420);

    // Day 2 (no activity): everything zero
    const day2 = report.dailySalesTrend.find((d) => d.day === 2)!;
    expect(day2.netRevenue).toBe(0);
    expect(day2.netProfit).toBe(0);

    // All days are present and sequential
    for (let i = 0; i < 31; i++) {
      expect(report.dailySalesTrend[i].day).toBe(i + 1);
    }
  });

  // ── Scenario 2: Top Selling Products ───

  it('Scenario 2: Top selling products ranked correctly with returns factored in', async () => {
    // ARRANGE
    // Product A: will sell 10 net
    const productA = await seedProduct({
      sku: 'RPT-TOP-A',
      name: 'Air Max',
      costPrice: 80,
      sellingPrice: 200,
      stock: 50,
      color: 'Red',
      size: '42',
    });

    // Product B: will sell 5 net
    const productB = await seedProduct({
      sku: 'RPT-TOP-B',
      name: 'Classic Runner',
      costPrice: 60,
      sellingPrice: 150,
      stock: 50,
      color: 'Blue',
      size: '40',
    });

    // Product C: will sell 15, return 10 → net 5
    const productC = await seedProduct({
      sku: 'RPT-TOP-C',
      name: 'Urban Walker',
      costPrice: 90,
      sellingPrice: 250,
      stock: 50,
      color: 'White',
      size: '44',
    });

    const testDate = new Date('2026-07-10T12:00:00.000');

    // Order 1: Product A × 10
    await seedOrderAtTime({
      receiptNumber: 'RPT-TOP-ORD-1',
      total: 2000, // 10 × 200
      createdAt: testDate,
      items: [
        {
          productId: productA.id,
          quantity: 10,
          costAtSale: 80,
          priceAtSale: 200,
        },
      ],
    });

    // Order 2: Product B × 5
    await seedOrderAtTime({
      receiptNumber: 'RPT-TOP-ORD-2',
      total: 750, // 5 × 150
      createdAt: testDate,
      items: [
        {
          productId: productB.id,
          quantity: 5,
          costAtSale: 60,
          priceAtSale: 150,
        },
      ],
    });

    // Order 3: Product C × 15, but 10 returned
    await seedOrderAtTime({
      receiptNumber: 'RPT-TOP-ORD-3',
      total: 3750, // 15 × 250
      createdAt: testDate,
      items: [
        {
          productId: productC.id,
          quantity: 15,
          costAtSale: 90,
          priceAtSale: 250,
          returnedQuantity: 10,
        },
      ],
    });

    // ACT
    const report = await service.getMonthlyReport(2026, 7);

    // ASSERT
    expect(report.topSellingProducts).toHaveLength(3);

    // 1st: Product A — Net 10
    expect(report.topSellingProducts[0].name).toBe('Air Max');
    expect(report.topSellingProducts[0].color).toBe('Red');
    expect(report.topSellingProducts[0].size).toBe('42');
    expect(report.topSellingProducts[0].netQuantitySold).toBe(10);

    // 2nd: Product B — Net 5 (tied with C, but B comes first alphabetically
    // in Map insertion order since B's order was created before C's)
    expect(report.topSellingProducts[1].netQuantitySold).toBe(5);

    // 3rd: Product C — Net 5 (15 sold - 10 returned)
    expect(report.topSellingProducts[2].netQuantitySold).toBe(5);

    // Both tied products are present
    const tiedNames = [
      report.topSellingProducts[1].name,
      report.topSellingProducts[2].name,
    ].sort();
    expect(tiedNames).toEqual(['Classic Runner', 'Urban Walker']);
  });

  // ── Scenario 3: Empty Month ────────────

  it('Scenario 3: Empty month returns zero metrics and full trend array', async () => {
    // ARRANGE — no data for February 2026

    // ACT
    const report = await service.getMonthlyReport(2026, 2);

    // ASSERT
    expect(report.year).toBe(2026);
    expect(report.month).toBe(2);
    expect(report.monthlyGrossSales).toBe(0);
    expect(report.monthlyTotalRefunds).toBe(0);
    expect(report.monthlyNetRevenue).toBe(0);
    expect(report.monthlyGrossCOGS).toBe(0);
    expect(report.monthlyRefundedCOGS).toBe(0);
    expect(report.monthlyNetCOGS).toBe(0);
    expect(report.monthlyExpenses).toBe(0);
    expect(report.monthlyNetProfit).toBe(0);
    // February 2026 has 28 days
    expect(report.dailySalesTrend).toHaveLength(28);
    expect(report.topSellingProducts).toEqual([]);

    // Every day should be zero
    for (const day of report.dailySalesTrend) {
      expect(day.netRevenue).toBe(0);
      expect(day.netProfit).toBe(0);
    }
  });

  // ── Scenario 4: Top products capped at 5 ─

  it('Scenario 4: Top selling products capped at 5 even with more products', async () => {
    // ARRANGE — create 7 distinct products with different quantities
    const products = [];
    for (let i = 1; i <= 7; i++) {
      const p = await seedProduct({
        sku: `RPT-CAP-${i}`,
        name: `Product ${i}`,
        costPrice: 10,
        sellingPrice: 50,
        stock: 100,
        color: `Color${i}`,
        size: `${40 + i}`,
      });
      products.push(p);
    }

    const testDate = new Date('2026-07-05T12:00:00.000');

    // Each product sold with increasing quantities: 1, 2, 3, 4, 5, 6, 7
    for (let i = 0; i < products.length; i++) {
      const qty = i + 1;
      await seedOrderAtTime({
        receiptNumber: `RPT-CAP-ORD-${i + 1}`,
        total: qty * 50,
        createdAt: testDate,
        items: [
          {
            productId: products[i].id,
            quantity: qty,
            costAtSale: 10,
            priceAtSale: 50,
          },
        ],
      });
    }

    // ACT
    const report = await service.getMonthlyReport(2026, 7);

    // ASSERT — only top 5 returned, sorted descending
    expect(report.topSellingProducts).toHaveLength(5);
    expect(report.topSellingProducts[0].name).toBe('Product 7');
    expect(report.topSellingProducts[0].netQuantitySold).toBe(7);
    expect(report.topSellingProducts[1].name).toBe('Product 6');
    expect(report.topSellingProducts[1].netQuantitySold).toBe(6);
    expect(report.topSellingProducts[4].name).toBe('Product 3');
    expect(report.topSellingProducts[4].netQuantitySold).toBe(3);
  });

  // ── Scenario 5: Month with refunds ─────

  it('Scenario 5: Monthly report with mixed sales and refunds', async () => {
    // ARRANGE
    const product = await seedProduct({
      sku: 'RPT-MREF-1',
      name: 'Monthly Refund Shoe',
      costPrice: 50,
      sellingPrice: 150,
      stock: 100,
    });

    // Sale on July 5: 2 × 150 = 300
    await seedOrderAtTime({
      receiptNumber: 'RPT-MREF-SALE',
      total: 300,
      createdAt: new Date('2026-07-05T10:00:00.000'),
      items: [
        { productId: product.id, quantity: 2, costAtSale: 50, priceAtSale: 150 },
      ],
    });

    // Refund on July 20: -150 (negative total order)
    await seedOrderAtTime({
      receiptNumber: 'RPT-MREF-RET',
      total: -150,
      createdAt: new Date('2026-07-20T14:00:00.000'),
      type: 'RETURN',
      items: [
        { productId: product.id, quantity: -1, costAtSale: 50, priceAtSale: 150 },
      ],
    });

    // Expense on July 10: 30
    await prisma.expense.create({
      data: {
        category: 'SUPPLIES',
        description: 'Cleaning supplies',
        amount: 30,
        createdAt: new Date('2026-07-10T09:00:00.000'),
      },
    });

    // ACT
    const report = await service.getMonthlyReport(2026, 7);

    // ASSERT
    expect(report.monthlyGrossSales).toBe(300);
    expect(report.monthlyTotalRefunds).toBe(150);
    // Net Revenue = 300 - 150 = 150
    expect(report.monthlyNetRevenue).toBe(150);
    // Gross COGS = 2 × 50 = 100 (only from positive order)
    expect(report.monthlyGrossCOGS).toBe(100);
    expect(report.monthlyRefundedCOGS).toBe(0);  // returnedQuantity is 0 on the sale order
    expect(report.monthlyNetCOGS).toBe(100);
    expect(report.monthlyExpenses).toBe(30);
    // Net Profit = 150 - 100 - 30 = 20
    expect(report.monthlyNetProfit).toBe(20);

    // Verify daily trend reflects the refund on day 20
    const day5 = report.dailySalesTrend.find((d) => d.day === 5)!;
    expect(day5.netRevenue).toBe(300);   // sale only
    const day20 = report.dailySalesTrend.find((d) => d.day === 20)!;
    expect(day20.netRevenue).toBe(-150); // refund only
  });
});
