import { Op } from 'sequelize';
import { BalanceService } from './balance.service';
import { Account } from './models/account.model';
import { AccountTransfer } from './models/account-transfer.model';
import { Card, CardType } from '../cards/models/card.model';
import { Transaction, TransactionType } from '../transactions/models/transaction.model';
import { ReconciliationItem } from '../reconciliations/models/reconciliation-item.model';
import { endOfDay } from '../common/utils/date.util';

describe('BalanceService', () => {
  let service: BalanceService;
  const sequelize = { fn: jest.fn(), col: jest.fn() };

  const account = { id: 'acc-1', initialBalance: '1000.00' } as unknown as Account;
  const card = { id: 'card-1', type: CardType.CREDIT } as unknown as Card;

  const mockAnchor = (date: string | null, realAmount = 0) =>
    jest.spyOn(ReconciliationItem, 'findOne').mockResolvedValue(
      (date
        ? { reconciliationId: 'r-1', realAmount, difference: 0, reconciliation: { date } }
        : null) as any,
    );

  const mockTotals = (rows: { type: TransactionType; total: string }[]) =>
    jest.spyOn(Transaction, 'findAll').mockResolvedValue(rows as any);

  const mockTransfers = (incoming: number, outgoing: number) =>
    jest
      .spyOn(AccountTransfer, 'sum')
      .mockImplementation(async (_field: any, opts: any) =>
        (opts.where.toAccountId ? incoming : outgoing) as any,
      );

  beforeEach(() => {
    service = new BalanceService(sequelize as any);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('getAccountBalance', () => {
    it('without a reconciliation starts from initialBalance and counts history up to asOf', async () => {
      mockAnchor(null);
      const findAll = mockTotals([
        { type: TransactionType.INCOME, total: '500' },
        { type: TransactionType.EXPENSE, total: '200' },
      ]);
      mockTransfers(0, 0);

      const { balance, anchor } = await service.getAccountBalance(account, '2026-11-12');

      expect(anchor).toBeNull();
      expect(balance).toBe(1300);
      const where = findAll.mock.calls[0][0]!.where as any;
      expect(where.accountId).toBe('acc-1');
      // Future-dated movements are excluded; no lower bound without an anchor.
      expect(where.date[Op.lte]).toEqual(endOfDay('2026-11-12'));
      expect(where.date[Op.gt]).toBeUndefined();
    });

    it('with a reconciliation, starts from its real amount and only counts movements after it', async () => {
      mockAnchor('2026-11-01', 8500);
      const findAll = mockTotals([{ type: TransactionType.EXPENSE, total: '300' }]);
      mockTransfers(0, 0);

      const { balance, anchor } = await service.getAccountBalance(account, '2026-11-12');

      expect(anchor?.date).toBe('2026-11-01');
      expect(balance).toBe(8200); // initialBalance is ignored once anchored
      const where = findAll.mock.calls[0][0]!.where as any;
      // Anything dated on/before the reconciliation day is already inside it.
      expect(where.date[Op.gt]).toEqual(endOfDay('2026-11-01'));
    });

    it('subtracts card payments and debit-card purchases, and applies transfers', async () => {
      mockAnchor('2026-11-01', 1000);
      mockTotals([
        { type: TransactionType.INCOME, total: '100' },
        { type: TransactionType.CARD_PAYMENT, total: '250' },
        { type: TransactionType.CARD_PURCHASE, total: '50.5' }, // only debit purchases carry accountId
      ]);
      const sum = mockTransfers(400, 150);

      const { balance } = await service.getAccountBalance(account, '2026-11-12');

      expect(balance).toBe(1000 + 100 - 250 - 50.5 + 400 - 150);
      const transferWhere = (sum.mock.calls[0][1] as any).where;
      expect(transferWhere.date[Op.gt]).toBe('2026-11-01');
      expect(transferWhere.date[Op.lte]).toBe('2026-11-12');
    });
  });

  describe('getCardDebt', () => {
    it('anchors current debt and keeps future MSI installments separate', async () => {
      mockAnchor('2026-11-01', 5000);
      const findAll = mockTotals([
        { type: TransactionType.CARD_PURCHASE, total: '700' },
        { type: TransactionType.CARD_PAYMENT, total: '2000' },
      ]);
      const msiSum = jest.spyOn(Transaction, 'sum').mockResolvedValue(1500 as any);

      const debt = await service.getCardDebt(card, '2026-11-12');

      expect(debt.currentDebt).toBe(3700);
      expect(debt.msiPending).toBe(1500);
      expect(debt.totalDebt).toBe(5200);

      // Current debt only counts rows up to asOf — an MSI installment whose
      // date arrives later is counted exactly once, when it posts.
      const where = findAll.mock.calls[0][0]!.where as any;
      expect(where.cardId).toBe('card-1');
      expect(where.date[Op.gt]).toEqual(endOfDay('2026-11-01'));
      expect(where.date[Op.lte]).toEqual(endOfDay('2026-11-12'));

      const msiWhere = (msiSum.mock.calls[0][1] as any).where;
      expect(msiWhere.date[Op.gt]).toEqual(endOfDay('2026-11-12'));
      expect(msiWhere.installmentMonths[Op.ne]).toBeNull();
    });

    it('without a reconciliation starts from zero and allows a negative (in-favour) balance', async () => {
      mockAnchor(null);
      mockTotals([
        { type: TransactionType.CARD_PURCHASE, total: '100' },
        { type: TransactionType.CARD_PAYMENT, total: '150' },
      ]);
      jest.spyOn(Transaction, 'sum').mockResolvedValue(null as any);

      const debt = await service.getCardDebt(card, '2026-11-12');

      expect(debt.currentDebt).toBe(-50);
      expect(debt.msiPending).toBe(0);
      expect(debt.anchor).toBeNull();
    });
  });
});
