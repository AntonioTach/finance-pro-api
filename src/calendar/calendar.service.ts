import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { Transaction, TransactionType } from '../transactions/models/transaction.model';
import { Card, PaymentDueType } from '../cards/models/card.model';
import { Subscription } from '../subscriptions/models/subscription.model';
import { Category } from '../categories/models/category.model';
import {
  MonthlyCalendarResponse,
  YearlyProjectionResponse,
  CalendarEvent,
  CardSummary,
  CardYearlyProjection,
  MonthProjection,
} from './dto/calendar.dto';

@Injectable()
export class CalendarService {
  constructor(
    @Inject(DATABASE_PROVIDER)
    private readonly sequelize: Sequelize,
  ) {}

  async getMonthlyCalendar(
    userId: string,
    year: number,
    month: number,
  ): Promise<MonthlyCalendarResponse> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const daysInMonth = endDate.getDate();

    // Fetch all required data in parallel
    const [cards, transactions, subscriptions] = await Promise.all([
      this.getUserCreditCards(userId),
      this.getMonthTransactions(userId, startDate, endDate),
      this.getActiveSubscriptions(userId),
    ]);

    // Initialize days array
    const days = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      date: new Date(year, month - 1, i + 1).toISOString().split('T')[0],
      events: [] as CalendarEvent[],
    }));

    // Add card events (cutoff and due dates)
    for (const card of cards) {
      this.addCardEvents(days, card, year, month);
    }

    // Add transaction events
    for (const transaction of transactions) {
      this.addTransactionEvent(days, transaction);
    }

    // Add subscription events
    for (const subscription of subscriptions) {
      this.addSubscriptionEvents(days, subscription, year, month);
    }

    // Calculate summary
    const summary = this.calculateMonthlySummary(cards, transactions, subscriptions, year, month);

    return {
      year,
      month,
      days,
      summary,
    };
  }

  async getYearlyProjection(
    userId: string,
    year: number,
  ): Promise<YearlyProjectionResponse> {
    const cards = await this.getUserCreditCards(userId);
    const msiTransactions = await this.getMsiTransactions(userId);

    const cardProjections: CardYearlyProjection[] = [];
    let totalMaxDebt = 0;

    for (const card of cards) {
      const cardMsiTransactions = msiTransactions.filter(
        (t) => t.cardId === card.id,
      );

      const projection = this.calculateCardYearlyProjection(
        card,
        cardMsiTransactions,
        year,
      );

      const maxDebt = Math.max(...projection.map((p) => p.totalDebt), 0);
      totalMaxDebt = Math.max(totalMaxDebt, maxDebt);

      cardProjections.push({
        cardId: card.id,
        cardName: card.name,
        network: card.network,
        last4: card.last4,
        maxDebt,
        projection,
      });
    }

    return {
      year,
      cards: cardProjections,
      totalMaxDebt,
    };
  }

  private async getUserCreditCards(userId: string): Promise<Card[]> {
    return Card.findAll({
      where: {
        userId,
        type: 'credit',
        status: 'active',
      },
    });
  }

  private async getMonthTransactions(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Transaction[]> {
    return Transaction.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [
        { model: Category, as: 'category' },
        { model: Card, as: 'card' },
      ],
      order: [['date', 'ASC']],
    });
  }

  private async getActiveSubscriptions(userId: string): Promise<Subscription[]> {
    return Subscription.findAll({
      where: {
        userId,
        isActive: true,
      },
      include: [{ model: Card, as: 'card' }],
    });
  }

  private async getMsiTransactions(userId: string): Promise<Transaction[]> {
    return Transaction.findAll({
      where: {
        userId,
        installmentMonths: {
          [Op.not]: null,
        },
        type: TransactionType.CARD_PURCHASE,
      },
      include: [{ model: Card, as: 'card' }],
      order: [['date', 'ASC']],
    });
  }

  private addCardEvents(
    days: { day: number; date: string; events: CalendarEvent[] }[],
    card: Card,
    year: number,
    month: number,
  ): void {
    // Add cutoff date event
    if (card.billingCutoffDay) {
      const cutoffDay = Math.min(card.billingCutoffDay, days.length);
      days[cutoffDay - 1].events.push({
        id: `cutoff-${card.id}-${year}-${month}`,
        date: days[cutoffDay - 1].date,
        type: 'cutoff',
        title: `Corte ${card.name}`,
        cardId: card.id,
        cardName: card.name,
        color: '#FFA726',
      });

      // Calculate and add due date event
      const dueDate = this.calculateDueDate(card, year, month);
      if (dueDate) {
        const dueDateObj = new Date(dueDate);
        if (
          dueDateObj.getFullYear() === year &&
          dueDateObj.getMonth() === month - 1
        ) {
          const dueDay = dueDateObj.getDate();
          days[dueDay - 1].events.push({
            id: `due-${card.id}-${year}-${month}`,
            date: dueDate,
            type: 'due_date',
            title: `Pago ${card.name}`,
            cardId: card.id,
            cardName: card.name,
            color: '#EF5350',
          });
        }
      }
    }
  }

  private calculateDueDate(card: Card, year: number, month: number): string | null {
    if (!card.billingCutoffDay || !card.paymentDueType || !card.paymentDueValue) {
      return null;
    }

    let dueDate: Date;

    if (card.paymentDueType === PaymentDueType.FIXED_DAY_OF_MONTH) {
      // Fixed day of the month
      dueDate = new Date(year, month - 1, card.paymentDueValue);
    } else {
      // Days after cutoff
      dueDate = new Date(year, month - 1, card.billingCutoffDay);
      dueDate.setDate(dueDate.getDate() + card.paymentDueValue);
    }

    return dueDate.toISOString().split('T')[0];
  }

  private addTransactionEvent(
    days: { day: number; date: string; events: CalendarEvent[] }[],
    transaction: Transaction,
  ): void {
    const transactionDate = new Date(transaction.date);
    const day = transactionDate.getDate();

    const isMsi = !!transaction.installmentMonths;
    const eventType = isMsi ? 'msi_payment' : 'transaction';
    const color = isMsi ? '#66BB6A' : '#42A5F5';

    let title = transaction.description;
    if (isMsi && transaction.installmentCurrent && transaction.installmentMonths) {
      title = `${transaction.description} (${transaction.installmentCurrent}/${transaction.installmentMonths})`;
    }

    days[day - 1].events.push({
      id: `transaction-${transaction.id}`,
      date: days[day - 1].date,
      type: eventType,
      title,
      amount: Number(transaction.amount),
      cardId: transaction.cardId ?? undefined,
      cardName: transaction.card?.name,
      color,
      transactionId: transaction.id,
      installmentInfo: isMsi
        ? {
            current: transaction.installmentCurrent!,
            total: transaction.installmentMonths!,
            parentTransactionId: transaction.parentTransactionId ?? transaction.id,
          }
        : undefined,
    });
  }

  private addSubscriptionEvents(
    days: { day: number; date: string; events: CalendarEvent[] }[],
    subscription: Subscription,
    year: number,
    month: number,
  ): void {
    const paymentDay = subscription.paymentDay;
    if (paymentDay && paymentDay <= days.length) {
      days[paymentDay - 1].events.push({
        id: `subscription-${subscription.id}-${year}-${month}`,
        date: days[paymentDay - 1].date,
        type: 'subscription',
        title: subscription.name,
        amount: Number(subscription.amount),
        cardId: subscription.cardId ?? undefined,
        cardName: (subscription as any).card?.name,
        color: '#AB47BC',
        subscriptionId: subscription.id,
      });
    }
  }

  private calculateMonthlySummary(
    cards: Card[],
    transactions: Transaction[],
    subscriptions: Subscription[],
    year: number,
    month: number,
  ): { totalToPay: number; byCard: CardSummary[] } {
    const cardSummaries: CardSummary[] = [];
    let totalToPay = 0;

    for (const card of cards) {
      const cardTransactions = transactions.filter((t) => t.cardId === card.id);
      const cardSubscriptions = subscriptions.filter((s) => s.cardId === card.id);

      const msiAmount = cardTransactions
        .filter((t) => t.installmentMonths)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const purchasesAmount = cardTransactions
        .filter((t) => !t.installmentMonths && t.type === TransactionType.CARD_PURCHASE)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const subscriptionsAmount = cardSubscriptions.reduce(
        (sum, s) => sum + Number(s.amount),
        0,
      );

      const totalAmount = msiAmount + purchasesAmount + subscriptionsAmount;
      totalToPay += totalAmount;

      cardSummaries.push({
        cardId: card.id,
        cardName: card.name,
        network: card.network,
        last4: card.last4,
        msiAmount,
        purchasesAmount,
        subscriptionsAmount,
        totalAmount,
        dueDate: this.calculateDueDate(card, year, month),
        cutoffDate: card.billingCutoffDay
          ? new Date(year, month - 1, card.billingCutoffDay).toISOString().split('T')[0]
          : null,
      });
    }

    return {
      totalToPay,
      byCard: cardSummaries,
    };
  }

  private calculateCardYearlyProjection(
    card: Card,
    msiTransactions: Transaction[],
    year: number,
  ): MonthProjection[] {
    const projections: MonthProjection[] = [];

    for (let month = 1; month <= 12; month++) {
      const monthDate = new Date(year, month - 1, 1);
      const msiDetails: MonthProjection['msiDetails'] = [];
      let msiDebt = 0;

      for (const transaction of msiTransactions) {
        // Check if this MSI is still active in this month
        const transactionDate = new Date(transaction.date);
        const monthsElapsed = this.getMonthsDifference(transactionDate, monthDate);
        const totalMonths = transaction.installmentMonths!;
        const remainingMonths = totalMonths - monthsElapsed;

        if (remainingMonths > 0) {
          const monthlyAmount = Number(transaction.amount);
          const remainingDebt = monthlyAmount * remainingMonths;
          msiDebt += remainingDebt;

          // Strip installment info from description for parent transactions
          let description = transaction.description;
          const installmentPattern = /\s*\(\d+\/\d+\)\s*$/;
          description = description.replace(installmentPattern, '');

          msiDetails.push({
            transactionId: transaction.parentTransactionId ?? transaction.id,
            description,
            monthlyAmount,
            remainingMonths,
            totalMonths,
          });
        }
      }

      projections.push({
        month,
        totalDebt: msiDebt,
        msiDebt,
        msiDetails,
        isPaidOff: msiDebt === 0,
      });
    }

    return projections;
  }

  private getMonthsDifference(startDate: Date, endDate: Date): number {
    return (
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth())
    );
  }
}
