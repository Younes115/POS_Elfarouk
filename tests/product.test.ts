import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { setupTestEnvironment } from './testUtils.js';

const { prisma, service, init, cleanup } = setupTestEnvironment('test_product.db');

beforeAll(() => {
  init();
}, 30_000);

beforeEach(async () => {
  await prisma.product.deleteMany();
});

afterAll(async () => {
  await cleanup();
});

describe('Product API', () => {
  it('Standard: Add a shoe product with category, color, and size', async () => {
    // Arrange
    const input = {
      sku: 'SHOE-BLK-42',
      name: 'Black Oxford',
      category: 'FORMAL',
      color: 'Black',
      size: '42',
      costPrice: 150,
      sellingPrice: 300,
      stock: 50,
    };

    // Act
    const created = await service.addProduct(input);
    const retrieved = await service.getProductBySku('SHOE-BLK-42');

    // Assert
    expect(created.sku).toBe('SHOE-BLK-42');
    expect(created.category).toBe('FORMAL');
    expect(created.color).toBe('Black');
    expect(created.size).toBe('42');
    expect(created.stock).toBe(50);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(created.id);
  });

  it('Standard: Add a bag product without size (size is null)', async () => {
    // Arrange
    const input = {
      sku: 'BAG-RED-01',
      name: 'Red Leather Tote',
      category: 'BAGS',
      color: 'Red',
      // size intentionally omitted — bags don't have sizes
      costPrice: 200,
      sellingPrice: 450,
      stock: 15,
    };

    // Act
    const created = await service.addProduct(input);

    // Assert
    expect(created.category).toBe('BAGS');
    expect(created.color).toBe('Red');
    expect(created.size).toBeNull();
    expect(created.stock).toBe(15);
  });

  it('Edge Case: Attempt to add a product with an already existing SKU', async () => {
    // Arrange
    const input = {
      sku: 'SHOE-DUP-01',
      name: 'White Sneaker',
      category: 'SNEAKERS',
      color: 'White',
      size: '40',
      costPrice: 100,
      sellingPrice: 250,
      stock: 10,
    };
    await service.addProduct(input);

    // Act & Assert
    // The exact Prisma error code for Unique Constraint is P2002.
    await expect(service.addProduct(input)).rejects.toThrow();
  });
});
