import { Op } from 'sequelize';
import { buildTransactionWhere } from './transaction-where.builder';
import { TransactionType } from '../../transactions/models/transaction.model';

describe('buildTransactionWhere', () => {
  const userId = 'user-1';

  it('scopes to the given user with no other filters', () => {
    const where = buildTransactionWhere(userId, {});
    expect(where).toEqual({ userId });
  });

  it('composes date range, type, category, card, amount and search with AND semantics', () => {
    const where: any = buildTransactionWhere(userId, {
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      type: TransactionType.EXPENSE,
      categoryId: 'cat-1',
      cardId: 'card-1',
      minAmount: 10,
      maxAmount: 500,
      search: 'coffee',
    });

    expect(where.userId).toBe(userId);
    expect(where.type).toBe(TransactionType.EXPENSE);
    expect(where.categoryId).toBe('cat-1');
    expect(where.cardId).toBe('card-1');
    expect(where.date[Op.gte]).toEqual(new Date('2026-01-01'));
    expect(where.date[Op.lte]).toEqual(new Date('2026-01-31'));
    expect(where.amount[Op.gte]).toBe(10);
    expect(where.amount[Op.lte]).toBe(500);
    expect(where[Op.or]).toEqual([
      { description: { [Op.iLike]: '%coffee%' } },
      { notes: { [Op.iLike]: '%coffee%' } },
    ]);
  });

  it('only sets amount bounds that were actually provided', () => {
    const where: any = buildTransactionWhere(userId, { minAmount: 50 });
    expect(where.amount[Op.gte]).toBe(50);
    expect(where.amount[Op.lte]).toBeUndefined();
  });
});
