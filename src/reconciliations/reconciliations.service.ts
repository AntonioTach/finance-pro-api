import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Reconciliation } from './models/reconciliation.model';
import { ReconciliationItem, ReconciliationTargetType } from './models/reconciliation-item.model';
import { CreateReconciliationDto } from './dto/create-reconciliation.dto';
import { Account, AccountStatus } from '../accounts/models/account.model';
import { Card, CardStatus, CardType } from '../cards/models/card.model';
import { BalanceAnchor, BalanceService } from '../accounts/balance.service';
import { todayStr } from '../common/utils/date.util';

export interface ReconciliationPreview {
  date: string;
  accounts: {
    accountId: string;
    name: string;
    type: string;
    isDefault: boolean;
    computedAmount: number;
    lastReconciliation: BalanceAnchor | null;
  }[];
  cards: {
    cardId: string;
    name: string;
    last4: string | null;
    computedAmount: number;
    msiPending: number;
    creditLimit: number | null;
    lastReconciliation: BalanceAnchor | null;
  }[];
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

@Injectable()
export class ReconciliationsService {
  constructor(
    @Inject(DATABASE_PROVIDER)
    private readonly sequelize: Sequelize,
    private readonly balanceService: BalanceService,
  ) {}

  /** What the app currently believes each account holds / each credit card owes on `date`. */
  async preview(userId: string, date?: string): Promise<ReconciliationPreview> {
    const day = this.validateDate(date);

    const [accounts, cards] = await Promise.all([
      Account.findAll({
        where: { userId, status: AccountStatus.ACTIVE },
        order: [
          ['isDefault', 'DESC'],
          ['name', 'ASC'],
        ],
      }),
      Card.findAll({
        where: { userId, status: CardStatus.ACTIVE, type: CardType.CREDIT },
        order: [['name', 'ASC']],
      }),
    ]);

    return {
      date: day,
      accounts: await Promise.all(
        accounts.map(async (a) => {
          const { balance, anchor } = await this.balanceService.getAccountBalance(a, day);
          return {
            accountId: a.id,
            name: a.name,
            type: a.type,
            isDefault: a.isDefault,
            computedAmount: balance,
            lastReconciliation: anchor,
          };
        }),
      ),
      cards: await Promise.all(
        cards.map(async (c) => {
          const debt = await this.balanceService.getCardDebt(c, day);
          return {
            cardId: c.id,
            name: c.name,
            last4: c.last4,
            computedAmount: debt.currentDebt,
            msiPending: debt.msiPending,
            creditLimit: c.creditLimit !== null ? Number(c.creditLimit) : null,
            lastReconciliation: debt.anchor,
          };
        }),
      ),
    };
  }

  async create(userId: string, dto: CreateReconciliationDto) {
    const day = this.validateDate(dto.date);
    const seen = new Set<string>();

    // Resolve + compute everything before opening the write transaction; the
    // computed amount is always recalculated server-side.
    const rows: Partial<ReconciliationItem>[] = [];
    for (const item of dto.items) {
      if (!!item.accountId === !!item.cardId) {
        throw new BadRequestException('Each item needs exactly one of accountId or cardId');
      }
      const key = item.accountId ?? item.cardId!;
      if (seen.has(key)) {
        throw new BadRequestException('The same account or card appears twice in this reconciliation');
      }
      seen.add(key);

      let computed: number;
      if (item.accountId) {
        const account = await Account.findOne({ where: { id: item.accountId, userId } });
        if (!account) throw new NotFoundException('Account not found');
        if (account.status !== AccountStatus.ACTIVE) {
          throw new BadRequestException(`Account "${account.name}" is inactive`);
        }
        computed = (await this.balanceService.getAccountBalance(account, day)).balance;
      } else {
        const card = await Card.findOne({ where: { id: item.cardId, userId } });
        if (!card) throw new NotFoundException('Card not found');
        if (card.type !== CardType.CREDIT) {
          throw new BadRequestException(
            'Only credit cards are reconciled directly; debit cards belong to an account',
          );
        }
        computed = (await this.balanceService.getCardDebt(card, day)).currentDebt;
      }

      const real = round2(item.realAmount);
      rows.push({
        targetType: item.accountId ? ReconciliationTargetType.ACCOUNT : ReconciliationTargetType.CARD,
        accountId: item.accountId ?? null,
        cardId: item.cardId ?? null,
        computedAmount: computed,
        realAmount: real,
        difference: round2(real - computed),
      });
    }

    const reconciliationId = await this.sequelize.transaction(async (t) => {
      const reconciliation = await Reconciliation.create({ userId, date: day, notes: dto.notes ?? null }, { transaction: t });
      await ReconciliationItem.bulkCreate(
        rows.map((r) => ({ ...r, reconciliationId: reconciliation.id })),
        { transaction: t },
      );
      return reconciliation.id;
    });

    return this.findOne(reconciliationId, userId);
  }

  async findAll(userId: string) {
    const reconciliations = await Reconciliation.findAll({
      where: { userId },
      include: this.itemInclude(),
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });
    return reconciliations.map((c) => this.serialize(c));
  }

  async findOne(id: string, userId: string) {
    const reconciliation = await Reconciliation.findOne({ where: { id, userId }, include: this.itemInclude() });
    if (!reconciliation) throw new NotFoundException('Reconciliation not found');
    return this.serialize(reconciliation);
  }

  /** Deleting a reconciliation makes each target fall back to its previous anchor. */
  async remove(id: string, userId: string): Promise<void> {
    const reconciliation = await Reconciliation.findOne({ where: { id, userId } });
    if (!reconciliation) throw new NotFoundException('Reconciliation not found');
    await reconciliation.destroy(); // reconciliation_items cascade
  }

  private itemInclude() {
    return [
      {
        model: ReconciliationItem,
        as: 'items',
        include: [
          { model: Account, as: 'account', attributes: ['id', 'name', 'type'] },
          { model: Card, as: 'card', attributes: ['id', 'name', 'last4'] },
        ],
      },
    ];
  }

  private serialize(reconciliation: Reconciliation) {
    const items = (reconciliation.items ?? []).map((i) => ({
      id: i.id,
      targetType: i.targetType,
      accountId: i.accountId,
      cardId: i.cardId,
      name: i.account?.name ?? i.card?.name ?? '—',
      last4: i.card?.last4 ?? null,
      computedAmount: Number(i.computedAmount),
      realAmount: Number(i.realAmount),
      difference: Number(i.difference),
    }));
    const sum = (type: ReconciliationTargetType) =>
      round2(items.filter((i) => i.targetType === type).reduce((s, i) => s + i.difference, 0));

    return {
      id: reconciliation.id,
      date: reconciliation.date,
      notes: reconciliation.notes,
      createdAt: reconciliation.createdAt,
      items,
      // Positive account difference = more money than recorded.
      accountsDifference: sum(ReconciliationTargetType.ACCOUNT),
      // Positive card difference = more debt than recorded.
      cardsDifference: sum(ReconciliationTargetType.CARD),
    };
  }

  private validateDate(date?: string): string {
    const today = todayStr();
    const day = date ? date.slice(0, 10) : today;
    if (day > today) {
      throw new BadRequestException('A reconciliation cannot be dated in the future');
    }
    return day;
  }
}
