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
  it('Standard: Add a product and fetch it', async () => {
    // Arrange
    const input = {
      sku: 'SHOE-001',
      name: 'Black Oxford',
      costPrice: 150,
      sellingPrice: 300,
      stock: 50,
    };

    // Act
    const created = await service.addProduct(input);
    const retrieved = await service.getProductBySku('SHOE-001');

    // Assert
    expect(created.sku).toBe('SHOE-001');
    expect(created.stock).toBe(50);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(created.id);
  });

  it('Edge Case: Attempt to add a product with an already existing SKU', async () => {
    // Arrange
    const input = {
      sku: 'SHOE-002',
      name: 'White Sneaker',
      costPrice: 100,
      sellingPrice: 250,
      stock: 10,
    };
    await service.addProduct(input);

    // Act & Assert
    // Using vitest's rejects to verify it throws an error.
    // The exact Prisma error code for Unique Constraint is P2002.
    await expect(service.addProduct(input)).rejects.toThrow();
  });
});
