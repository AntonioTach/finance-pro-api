import { BadRequestException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionType } from './models/transaction.model';
import { Card, CardType } from '../cards/models/card.model';
import { BudgetsService } from '../budgets/budgets.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let budgetsService: BudgetsService;
  let sequelize: { transaction: jest.Mock };

  beforeEach(() => {
    budgetsService = {
      checkAlerts: jest.fn().mockResolvedValue(undefined),
    } as unknown as BudgetsService;

    // Mimics Sequelize's transaction(callback) helper: just invoke the
    // callback with a fake transaction handle and return its result.
    sequelize = {
      transaction: jest.fn((cb: (t: unknown) => Promise<unknown>) => cb('fake-db-transaction')),
    };

    service = new TransactionsService(sequelize as any, budgetsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('calculateInstallmentDate', () => {
    const call = (purchaseDate: Date, cutoffDay: number, month: number): Date =>
      (service as any).calculateInstallmentDate(purchaseDate, cutoffDay, month);

    it('installment 1 stays in the current cycle when purchased before the cutoff', () => {
      const result = call(new Date(2026, 0, 5), 15, 1); // Jan 5, cutoff 15
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(15);
    });

    it('installment 1 rolls to next cycle when purchased on/after the cutoff', () => {
      const result = call(new Date(2026, 0, 20), 15, 1); // Jan 20, cutoff 15
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(15);
    });

    it('later installments each advance one billing cycle, snapped to the cutoff day', () => {
      const purchase = new Date(2026, 0, 5); // before cutoff
      const month3 = call(purchase, 15, 3);
      expect(month3.getFullYear()).toBe(2026);
      expect(month3.getMonth()).toBe(2); // March (Jan=0 + offset 2)
      expect(month3.getDate()).toBe(15);
    });

    it('rolls over year boundary correctly', () => {
      const purchase = new Date(2026, 10, 20); // Nov 20, after cutoff day 15
      const month3 = call(purchase, 15, 3);
      expect(month3.getFullYear()).toBe(2027);
      expect(month3.getMonth()).toBe(1); // Feb 2027
    });
  });

  describe('generateInstallments (via create)', () => {
    const baseDto: CreateTransactionDto = {
      type: TransactionType.CARD_PURCHASE,
      amount: 100,
      categoryId: 'cat-1',
      description: 'Laptop',
      date: '2026-01-05',
      cardId: 'card-1',
      installmentMonths: 3,
    };

    const creditCard = {
      id: 'card-1',
      userId: 'user-1',
      type: CardType.CREDIT,
      billingCutoffDay: 15,
    } as Card;

    function mockCreatedTransaction(overrides: Partial<Transaction> = {}) {
      return {
        id: 'parent-1',
        update: jest.fn().mockResolvedValue(undefined),
        ...overrides,
      } as unknown as Transaction;
    }

    beforeEach(() => {
      jest.spyOn((service as any), 'validateCategoryOwnership').mockResolvedValue(undefined);
      jest.spyOn((service as any), 'validateCardOwnership').mockResolvedValue(creditCard);
    });

    it('splits the total amount into whole cents with no rounding drift, folding the remainder into the last installment', async () => {
      const parent = mockCreatedTransaction();
      jest.spyOn(Transaction, 'create').mockResolvedValue(parent as any);
      const bulkCreateSpy = jest.spyOn(Transaction, 'bulkCreate').mockResolvedValue([] as any);

      // 100 / 3 = 33.33333... — a naive toFixed(2) split loses a cent.
      await service.create('user-1', { ...baseDto, amount: 100, installmentMonths: 3 });

      const parentAmount = (parent.update as jest.Mock).mock.calls[0][0].amount;
      const children = bulkCreateSpy.mock.calls[0][0] as Array<{ amount: number }>;
      const total = parentAmount + children.reduce((sum, c) => sum + c.amount, 0);

      expect(total).toBeCloseTo(100, 2);
      expect(children).toHaveLength(2); // months 2 and 3
    });

    it('creates parent + children inside the same DB transaction', async () => {
      const parent = mockCreatedTransaction();
      const createSpy = jest.spyOn(Transaction, 'create').mockResolvedValue(parent as any);
      const bulkCreateSpy = jest.spyOn(Transaction, 'bulkCreate').mockResolvedValue([] as any);

      await service.create('user-1', baseDto);

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(createSpy.mock.calls[0][1]).toEqual({ transaction: 'fake-db-transaction' });
      expect(bulkCreateSpy.mock.calls[0][1]).toEqual({ transaction: 'fake-db-transaction' });
      expect((parent.update as jest.Mock).mock.calls[0][1]).toEqual({
        transaction: 'fake-db-transaction',
      });
    });

    it('snaps the parent (installment 1) date to the billing cutoff day, consistent with the other installments', async () => {
      const parent = mockCreatedTransaction();
      jest.spyOn(Transaction, 'create').mockResolvedValue(parent as any);
      jest.spyOn(Transaction, 'bulkCreate').mockResolvedValue([] as any);

      await service.create('user-1', { ...baseDto, date: '2026-01-05' }); // before cutoff (15)

      const parentUpdate = (parent.update as jest.Mock).mock.calls[0][0];
      expect(new Date(parentUpdate.date).getDate()).toBe(15);
    });

    it('numbers children 2..N and links them to the parent via parentTransactionId', async () => {
      const parent = mockCreatedTransaction({ id: 'parent-xyz' } as any);
      jest.spyOn(Transaction, 'create').mockResolvedValue(parent as any);
      const bulkCreateSpy = jest.spyOn(Transaction, 'bulkCreate').mockResolvedValue([] as any);

      await service.create('user-1', { ...baseDto, installmentMonths: 6 });

      const children = bulkCreateSpy.mock.calls[0][0] as Array<Partial<Transaction>>;
      expect(children).toHaveLength(5);
      expect(children.map((c) => c.installmentCurrent)).toEqual([2, 3, 4, 5, 6]);
      expect(children.every((c) => c.parentTransactionId === 'parent-xyz')).toBe(true);
    });
  });

  describe('update', () => {
    it('rejects changes to installmentMonths without touching category/card validation', async () => {
      const fakeTransaction = { id: 't-1', userId: 'user-1' } as Transaction;
      jest.spyOn(service, 'findOne').mockResolvedValue(fakeTransaction);
      const categorySpy = jest.spyOn((service as any), 'validateCategoryOwnership');

      await expect(
        service.update('t-1', 'user-1', { installmentMonths: 12 } as any),
      ).rejects.toThrow(BadRequestException);

      expect(categorySpy).not.toHaveBeenCalled();
    });
  });

  describe('cancelMsi', () => {
    it('only deletes future installments, keeps the parent and past/current ones', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const parent = {
        id: 'parent-1',
        installmentMonths: 3,
        description: 'Laptop (1/3)',
        notes: null,
        update: jest.fn().mockResolvedValue(undefined),
      } as unknown as Transaction;

      const installments = [
        parent,
        { id: 'child-2', date: yesterday, installmentCurrent: 2 },
        { id: 'child-3', date: nextMonth, installmentCurrent: 3 },
      ] as unknown as Transaction[];

      jest.spyOn(service, 'getMsiGroup').mockResolvedValue({ parent, installments });
      const destroySpy = jest.spyOn(Transaction, 'destroy').mockResolvedValue(1 as any);
      jest.spyOn(service, 'findOne').mockResolvedValue(parent);

      const result = await service.cancelMsi('parent-1', 'user-1');

      expect(destroySpy).toHaveBeenCalledWith({
        where: { id: ['child-3'], userId: 'user-1' },
      });
      expect(result.deletedCount).toBe(1);
    });
  });
});
