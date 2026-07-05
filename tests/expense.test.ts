import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { setupTestEnvironment } from './testUtils.js';

const { prisma, service, init, cleanup } = setupTestEnvironment('test_expense.db');

beforeAll(() => {
  init();
}, 30_000);

beforeEach(async () => {
  await prisma.expense.deleteMany();
});

afterAll(async () => {
  await cleanup();
});

describe('Expense API', () => {
  it('Standard: Add an expense and verify it is saved', async () => {
    // Arrange
    const input = {
      description: 'Office Supplies',
      amount: 150,
    };

    // Act
    const expense = await service.addExpense(input);

    // Assert
    expect(expense.description).toBe('Office Supplies');
    expect(expense.amount).toBe(150);
    expect(expense.id).toBeDefined();
    expect(expense.createdAt).toBeDefined();
  });
});
