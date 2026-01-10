import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Sequelize } from 'sequelize-typescript';
import { Card, CardType, CardStatus } from './models/card.model';
import { Transaction, TransactionType } from '../transactions/models/transaction.model';

export interface CardSummary {
  cardId: string;
  cardName: string;
  cardType: CardType;
  network: string | null;
  last4: string | null;
  currency: string;
  // Credit card specific
  outstandingDebt: number | null;
  availableCredit: number | null;
  creditLimit: number | null;
  nextCutoffDate: string | null;
  nextDueDate: string | null;
}

@Injectable()
export class CardSummaryService {
  constructor(
    @Inject(DATABASE_PROVIDER)
    private readonly sequelize: Sequelize,
  ) {}

  async getAllCardsSummary(userId: string): Promise<CardSummary[]> {
    const cards = await Card.findAll({
      where: { userId, status: CardStatus.ACTIVE },
      order: [['name', 'ASC']],
    });

    const summaries = await Promise.all(
      cards.map((card) => this.buildCardSummary(card)),
    );

    // Sort by nextDueDate for credit cards (soonest first)
    return summaries.sort((a, b) => {
      if (!a.nextDueDate) return 1;
      if (!b.nextDueDate) return -1;
      return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
    });
  }

  async getCardSummary(cardId: string, userId: string): Promise<CardSummary> {
    const card = await Card.findOne({
      where: { id: cardId, userId },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return this.buildCardSummary(card);
  }

  private async buildCardSummary(card: Card): Promise<CardSummary> {
    const baseSummary: CardSummary = {
      cardId: card.id,
      cardName: card.name,
      cardType: card.type,
      network: card.network,
      last4: card.last4,
      currency: card.currency,
      outstandingDebt: null,
      availableCredit: null,
      creditLimit: null,
      nextCutoffDate: null,
      nextDueDate: null,
    };

    if (card.type === CardType.DEBIT) {
      return baseSummary;
    }

    // Credit card calculations
    const outstandingDebt = await this.calculateOutstandingDebt(card.id);
    const availableCredit = Math.max(0, Number(card.creditLimit) - outstandingDebt);
    const nextCutoffDate = this.getNextCutoffDate(card.billingCutoffDay);
    const nextDueDate = this.getNextDueDate(card, nextCutoffDate);

    return {
      ...baseSummary,
      outstandingDebt,
      availableCredit,
      creditLimit: Number(card.creditLimit),
      nextCutoffDate: nextCutoffDate.toISOString().split('T')[0],
      nextDueDate: nextDueDate.toISOString().split('T')[0],
    };
  }

  /**
   * Calculates the outstanding debt for a credit card
   * Formula: SUM(CARD_PURCHASE) - SUM(CARD_PAYMENT)
   */
  async calculateOutstandingDebt(cardId: string): Promise<number> {
    const transactions: any[] = await Transaction.findAll({
      where: { cardId },
      attributes: [
        'type',
        [this.sequelize.fn('SUM', this.sequelize.col('amount')), 'total'],
      ],
      group: ['type'],
      raw: true,
    });

    const purchases = transactions.find(
      (t) => t.type === TransactionType.CARD_PURCHASE,
    )?.total || 0;

    const payments = transactions.find(
      (t) => t.type === TransactionType.CARD_PAYMENT,
    )?.total || 0;

    return Math.max(0, Number(purchases) - Number(payments));
  }

  getNextCutoffDate(cutoffDay: number, today: Date = new Date()): Date {
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const cutoffThisMonth = this.getValidDayOfMonth(currentYear, currentMonth, cutoffDay);

    if (today.getDate() <= cutoffThisMonth) {
      return new Date(currentYear, currentMonth, cutoffThisMonth);
    }

    // Next month
    const nextMonth = currentMonth + 1;
    const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
    const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;

    return new Date(
      nextYear,
      adjustedMonth,
      this.getValidDayOfMonth(nextYear, adjustedMonth, cutoffDay),
    );
  }

  getNextDueDate(card: Card, nextCutoff: Date): Date {
    if (card.paymentDueType === 'fixed_day') {
      const dueDay = this.getValidDayOfMonth(
        nextCutoff.getFullYear(),
        nextCutoff.getMonth(),
        card.paymentDueValue,
      );
      return new Date(nextCutoff.getFullYear(), nextCutoff.getMonth(), dueDay);
    }

    // DAYS_AFTER_CUTOFF
    const dueDate = new Date(nextCutoff);
    dueDate.setDate(dueDate.getDate() + card.paymentDueValue);
    return dueDate;
  }

  private getValidDayOfMonth(year: number, month: number, day: number): number {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return Math.min(day, lastDay);
  }
}
