import { Inject, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Account } from './models/account.model';
import { AccountTransfer } from './models/account-transfer.model';
import { Card } from '../cards/models/card.model';
import { Transaction, TransactionType } from '../transactions/models/transaction.model';
import { Reconciliation } from '../reconciliations/models/reconciliation.model';
import { ReconciliationItem } from '../reconciliations/models/reconciliation-item.model';
import { endOfDay, startOfDay, todayStr } from '../common/utils/date.util';

export interface BalanceAnchor {
  reconciliationId: string;
  date: string;
  /** When the reconciliation was saved: same-day movements logged after it still count. */
  createdAt: Date;
  realAmount: number;
  difference: number;
}

export interface CardDebt {
  /** Anchored debt up to `asOf`, excluding future-dated MSI installments. Negative = balance in your favour. */
  currentDebt: number;
  /** MSI installments dated after `asOf` (already generated as future rows). */
  msiPending: number;
  totalDebt: number;
  anchor: BalanceAnchor | null;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * The ONLY place where account balances and credit-card debt are computed.
 *
 *   balance = anchor.realAmount (or account.initialBalance with no reconciliation)
 *           + movements dated in (anchor.date, asOf]
 *
 * A reconciliation on day D covers what had happened when it was saved. A movement
 * counts if it is dated after D, or dated D and logged (createdAt) after the
 * reconciliation was saved. Backdated entries are already "inside" the real amount.
 * Future-dated movements (after asOf) are never counted.
 */
@Injectable()
export class BalanceService {
  constructor(
    @Inject(DATABASE_PROVIDER)
    private readonly sequelize: Sequelize,
  ) {}

  async getAnchor(
    target: { accountId: string } | { cardId: string },
    asOf: string = todayStr(),
  ): Promise<BalanceAnchor | null> {
    const item = await ReconciliationItem.findOne({
      where: target,
      include: [
        {
          model: Reconciliation,
          as: 'reconciliation',
          required: true,
          where: { date: { [Op.lte]: asOf } },
        },
      ],
      order: [
        [{ model: Reconciliation, as: 'reconciliation' }, 'date', 'DESC'],
        [{ model: Reconciliation, as: 'reconciliation' }, 'createdAt', 'DESC'],
      ],
    });

    if (!item) return null;
    return {
      reconciliationId: item.reconciliationId,
      date: item.reconciliation.date,
      createdAt: item.reconciliation.createdAt,
      realAmount: Number(item.realAmount),
      difference: Number(item.difference),
    };
  }

  async getAccountBalance(
    account: Account,
    asOf: string = todayStr(),
  ): Promise<{ balance: number; anchor: BalanceAnchor | null }> {
    const anchor = await this.getAnchor({ accountId: account.id }, asOf);
    const base = anchor ? anchor.realAmount : Number(account.initialBalance);

    const totals = await this.sumByType({
      accountId: account.id,
      ...this.movementsAfter(anchor, asOf),
    });

    const transferRange = this.transfersAfter(anchor, asOf);
    const [transfersIn, transfersOut] = await Promise.all([
      AccountTransfer.sum('amount', {
        where: { toAccountId: account.id, ...transferRange },
      }),
      AccountTransfer.sum('amount', {
        where: { fromAccountId: account.id, ...transferRange },
      }),
    ]);

    const balance =
      base +
      totals[TransactionType.INCOME] -
      totals[TransactionType.EXPENSE] -
      totals[TransactionType.CARD_PAYMENT] -
      totals[TransactionType.CARD_PURCHASE] + // only debit purchases carry accountId
      Number(transfersIn || 0) -
      Number(transfersOut || 0);

    return { balance: round2(balance), anchor };
  }

  async getCardDebt(card: Card, asOf: string = todayStr()): Promise<CardDebt> {
    const anchor = await this.getAnchor({ cardId: card.id }, asOf);
    const base = anchor ? anchor.realAmount : 0;

    const totals = await this.sumByType({ cardId: card.id, ...this.movementsAfter(anchor, asOf) });
    const currentDebt = round2(
      base + totals[TransactionType.CARD_PURCHASE] - totals[TransactionType.CARD_PAYMENT],
    );

    const msiPendingRaw = await Transaction.sum('amount', {
      where: {
        cardId: card.id,
        type: TransactionType.CARD_PURCHASE,
        installmentMonths: { [Op.ne]: null },
        date: { [Op.gt]: endOfDay(asOf) },
      },
    });
    const msiPending = round2(Number(msiPendingRaw || 0));

    return {
      currentDebt,
      msiPending,
      totalDebt: round2(currentDebt + msiPending),
      anchor,
    };
  }

  /** Transaction filter: dated in (anchor day, asOf], or on the anchor day but logged after it. */
  private movementsAfter(anchor: BalanceAnchor | null, asOf: string): Record<string | symbol, unknown> {
    if (!anchor) return { date: { [Op.lte]: endOfDay(asOf) } };
    return {
      [Op.or]: [
        { date: { [Op.gt]: endOfDay(anchor.date), [Op.lte]: endOfDay(asOf) } },
        {
          date: { [Op.gte]: startOfDay(anchor.date), [Op.lte]: endOfDay(anchor.date) },
          createdAt: { [Op.gt]: anchor.createdAt },
        },
      ],
    };
  }

  /** Same rule for transfers, whose `date` is DATEONLY. */
  private transfersAfter(anchor: BalanceAnchor | null, asOf: string): Record<string | symbol, unknown> {
    if (!anchor) return { date: { [Op.lte]: asOf } };
    return {
      [Op.or]: [
        { date: { [Op.gt]: anchor.date, [Op.lte]: asOf } },
        { date: anchor.date, createdAt: { [Op.gt]: anchor.createdAt } },
      ],
    };
  }

  private async sumByType(where: Record<string, unknown>): Promise<Record<TransactionType, number>> {
    const rows = (await Transaction.findAll({
      where,
      attributes: ['type', [this.sequelize.fn('SUM', this.sequelize.col('amount')), 'total']],
      group: ['type'],
      raw: true,
    })) as unknown as { type: TransactionType; total: string }[];

    const totals = {
      [TransactionType.INCOME]: 0,
      [TransactionType.EXPENSE]: 0,
      [TransactionType.CARD_PURCHASE]: 0,
      [TransactionType.CARD_PAYMENT]: 0,
    };
    for (const row of rows) totals[row.type] = Number(row.total || 0);
    return totals;
  }
}
