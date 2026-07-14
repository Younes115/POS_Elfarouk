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

describe('Expense API — createExpense', () => {
  it('Success: creates an expense with valid inputs', async () => {
    const expense = await service.createExpense(150, 'RENT', 'Office rent for July');

    expect(expense.id).toBeDefined();
    expect(expense.amount).toBe(150);
    expect(expense.category).toBe('RENT');
    expect(expense.description).toBe('Office rent for July');
    expect(expense.createdAt).toBeDefined();
  });

  it('Success: trims whitespace from category and description', async () => {
    const expense = await service.createExpense(100, '  WAGES  ', '  Staff salary  ');

    expect(expense.category).toBe('WAGES');
    expect(expense.description).toBe('Staff salary');
  });

  it('Failure: throws on zero amount', async () => {
    await expect(
      service.createExpense(0, 'RENT', 'Zero test'),
    ).rejects.toThrow('Expense amount must be greater than 0.');
  });

  it('Failure: throws on negative amount', async () => {
    await expect(
      service.createExpense(-50, 'RENT', 'Negative test'),
    ).rejects.toThrow('Expense amount must be greater than 0.');
  });

  it('Failure: throws on empty category', async () => {
    await expect(
      service.createExpense(100, '', 'Missing category'),
    ).rejects.toThrow('Expense category is required.');
  });

  it('Failure: throws on whitespace-only category', async () => {
    await expect(
      service.createExpense(100, '   ', 'Whitespace category'),
    ).rejects.toThrow('Expense category is required.');
  });

  it('Failure: throws on empty description', async () => {
    await expect(
      service.createExpense(100, 'RENT', ''),
    ).rejects.toThrow('Expense description is required.');
  });

  it('Failure: throws on whitespace-only description', async () => {
    await expect(
      service.createExpense(100, 'RENT', '   '),
    ).rejects.toThrow('Expense description is required.');
  });
});

describe('Expense API — getDailyExpenses', () => {
  it('Success: returns expenses created on the given date', async () => {
    // Create two expenses (they'll use the current date)
    await service.createExpense(100, 'RENT', 'Rent');
    await service.createExpense(50, 'UTILITIES', 'Electricity');

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const expenses = await service.getDailyExpenses(dateStr);

    expect(expenses).toHaveLength(2);
    expect(expenses.map(e => e.category).sort()).toEqual(['RENT', 'UTILITIES']);
  });

  it('Boundary: returns no results for a different date', async () => {
    await service.createExpense(100, 'RENT', 'Rent');

    // Query for a date far in the past — should return nothing
    const expenses = await service.getDailyExpenses('2020-01-01');

    expect(expenses).toHaveLength(0);
  });

  it('Boundary: includes item created at 23:59:59 of the target day', async () => {
    // Use Prisma directly to insert at a specific time
    const targetDate = new Date('2025-06-15T23:59:59.000');
    await prisma.expense.create({
      data: {
        category: 'LATE',
        description: 'Late night expense',
        amount: 200,
        createdAt: targetDate,
      },
    });

    const expenses = await service.getDailyExpenses('2025-06-15');
    expect(expenses).toHaveLength(1);
    expect(expenses[0].description).toBe('Late night expense');
  });

  it('Boundary: excludes item created at 00:00:01 the NEXT day', async () => {
    // Insert at 2025-06-16 00:00:01 — should NOT appear when querying 2025-06-15
    const nextDay = new Date('2025-06-16T00:00:01.000');
    await prisma.expense.create({
      data: {
        category: 'NEXT',
        description: 'Next day expense',
        amount: 300,
        createdAt: nextDay,
      },
    });

    const expenses = await service.getDailyExpenses('2025-06-15');
    expect(expenses).toHaveLength(0);

    // But it SHOULD appear when querying the next day
    const nextDayExpenses = await service.getDailyExpenses('2025-06-16');
    expect(nextDayExpenses).toHaveLength(1);
    expect(nextDayExpenses[0].description).toBe('Next day expense');
  });
});

describe('Expense API — deleteExpense', () => {
  it('Success: deletes an expense and verifies it no longer exists', async () => {
    const expense = await service.createExpense(100, 'WAGES', 'Salary payment');

    // Delete it
    const deleted = await service.deleteExpense(expense.id);
    expect(deleted.id).toBe(expense.id);

    // Verify it's gone from the database
    const remaining = await prisma.expense.findUnique({
      where: { id: expense.id },
    });
    expect(remaining).toBeNull();
  });

  it('Failure: throws when deleting a non-existent expense', async () => {
    await expect(
      service.deleteExpense('non-existent-id'),
    ).rejects.toThrow();
  });
});
