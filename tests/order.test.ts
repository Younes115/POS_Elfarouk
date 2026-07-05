import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { setupTestEnvironment } from './testUtils.js';

const { prisma, service, init, cleanup } = setupTestEnvironment('test_order.db');

beforeAll(() => {
  init();
}, 30_000);

beforeEach(async () => {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
});

afterAll(async () => {
  await cleanup();
});

describe('Order API', () => {
  it('Standard: Complete a SALE order and verify stock decrement', async () => {
    // Arrange
    const product = await service.addProduct({
      sku: 'SALE-ITEM-1',
      name: 'Sale Item',
      costPrice: 50,
      sellingPrice: 100,
      stock: 10,
    });

    const orderData = {
      receiptNumber: 'SALE-001',
      subTotal: 200,
      total: 200,
      type: 'SALE' as const,
    };
    const items = [
      { productId: product.id, quantity: 2, costAtSale: 50, priceAtSale: 100 },
    ];

    // Act
    const order = await service.createOrder(orderData, items);
    const updatedProduct = await service.getProductBySku('SALE-ITEM-1');

    // Assert
    expect(order.type).toBe('SALE');
    expect(order.items[0].quantity).toBe(2);
    // Stock decreased from 10 to 8
    expect(updatedProduct!.stock).toBe(8);
  });

  it('Standard: Complete a RETURN order and verify stock increment', async () => {
    // Arrange
    const product = await service.addProduct({
      sku: 'RET-ITEM-1',
      name: 'Return Item',
      costPrice: 50,
      sellingPrice: 100,
      stock: 5,
    });

    const orderData = {
      receiptNumber: 'RET-001',
      subTotal: -100,
      total: -100,
      type: 'RETURN' as const,
    };
    const items = [
      { productId: product.id, quantity: -1, costAtSale: 50, priceAtSale: 100 },
    ];

    // Act
    const order = await service.createOrder(orderData, items);
    const updatedProduct = await service.getProductBySku('RET-ITEM-1');

    // Assert
    expect(order.type).toBe('RETURN');
    expect(order.items[0].quantity).toBe(-1);
    // Stock increased from 5 to 6
    expect(updatedProduct!.stock).toBe(6);
  });

  it('Edge Case: Selling an item when requested quantity is greater than available stock', async () => {
    // Arrange
    const product = await service.addProduct({
      sku: 'OVERSELL-1',
      name: 'Oversell Item',
      costPrice: 10,
      sellingPrice: 20,
      stock: 5, // Only 5 available
    });

    const orderData = {
      receiptNumber: 'SALE-OVERSELL',
      subTotal: 200,
      total: 200,
      type: 'SALE' as const,
    };
    const items = [
      { productId: product.id, quantity: 10, costAtSale: 10, priceAtSale: 20 },
    ];

    // Act
    await service.createOrder(orderData, items);
    const updatedProduct = await service.getProductBySku('OVERSELL-1');

    // Assert
    // Prisma does not inherently block negative integers in SQLite unless we strictly enforce it,
    // but the test explicitly asks to check what happens.
    // Assuming our current logic just allows it (resulting in -5 stock), we verify that behavior.
    expect(updatedProduct!.stock).toBe(-5);
  });

  it('Edge Case: Applying a discountValue greater than subTotal enforces total >= 0', async () => {
    // Arrange
    const product = await service.addProduct({
      sku: 'DISCOUNT-1',
      name: 'Discount Item',
      costPrice: 50,
      sellingPrice: 100,
      stock: 10,
    });

    // Discount of 150 on a 100 subtotal
    const orderData = {
      receiptNumber: 'SALE-DISCOUNT',
      subTotal: 100,
      discountValue: 150,
      total: -50, // Malicious or buggy client passed negative total
      type: 'SALE' as const,
    };
    const items = [
      { productId: product.id, quantity: 1, costAtSale: 50, priceAtSale: 100 },
    ];

    // Act
    const order = await service.createOrder(orderData, items);

    // Assert
    // The posService overrides the total with Math.max(0, subTotal - discountValue)
    expect(order.total).toBe(0);
    expect(order.discountValue).toBe(150);
  });
});
