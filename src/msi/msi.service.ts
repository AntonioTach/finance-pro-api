import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { Transaction, TransactionType } from '../transactions/models/transaction.model';
import { Card } from '../cards/models/card.model';
import {
  CardYearlyProjection,
  MonthProjection,
  MsiDetail,
  MsiGroupFilters,
  MsiGroupSummary,
  YearlyProjectionResponse,
} from './dto/msi.dto';

const INSTALLMENT_SUFFIX_PATTERN = /\s*\(\d+\/\d+\)\s*$/;

/**
 * Single source of truth for "MSI group" reporting (active/completed
 * installment purchases + yearly debt projection). Both getMsiGroups and
 * getYearlyProjection compute remaining debt through the same
 * groupMsiTransactions/calculateGroupRemainingDebt pair so the numbers they
 * report can never drift apart.
 */
@Injectable()
export class MsiService {
  constructor(
    @Inject(DATABASE_PROVIDER)
    private readonly sequelize: Sequelize,
  ) {}

  async getMsiGroups(
    userId: string,
    filters: MsiGroupFilters = {},
  ): Promise<MsiGroupSummary[]> {
    const allInstallments = await this.getMsiTransactions(userId);
    const groups = this.groupMsiTransactions(allInstallments);

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const results: MsiGroupSummary[] = [];

    for (const installments of groups.values()) {
      const parent = installments.find((t) => !t.parentTransactionId) ?? installments[0];

      if (filters.cardId && parent.cardId !== filters.cardId) {
        continue;
      }

      const sorted = [...installments].sort(
        (a, b) => (a.installmentCurrent ?? 0) - (b.installmentCurrent ?? 0),
      );

      const { remainingDebt, remainingMonths } = this.calculateGroupRemainingDebt(
        sorted,
        monthStart,
      );
      const status = remainingMonths > 0 ? 'active' : 'completed';

      if (filters.status && filters.status !== status) {
        continue;
      }

      const totalMonths = parent.installmentMonths ?? sorted.length;
      const nonLastInstallment =
        sorted.find((t) => (t.installmentCurrent ?? 0) < totalMonths) ?? sorted[0];
      const lastInstallment = sorted[sorted.length - 1];
      const totalAmount = sorted.reduce((sum, t) => sum + Number(t.amount), 0);

      results.push({
        parentTransactionId: parent.id,
        description: parent.description.replace(INSTALLMENT_SUFFIX_PATTERN, ''),
        categoryId: parent.categoryId,
        cardId: parent.cardId!,
        cardName: parent.card?.name ?? '',
        cardLast4: parent.card?.last4 ?? null,
        totalMonths,
        monthlyAmount: Number(nonLastInstallment.amount),
        totalAmount,
        remainingAmount: remainingDebt,
        remainingMonths,
        installmentsPaid: sorted.length - remainingMonths,
        startDate: this.toIsoDate(parent.date),
        endDate: this.toIsoDate(lastInstallment.date),
        status,
      });
    }

    results.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    return results;
  }

  async getYearlyProjection(
    userId: string,
    year: number,
  ): Promise<YearlyProjectionResponse> {
    const cards = await this.getUserCreditCards(userId);
    const msiTransactions = await this.getMsiTransactions(userId);

    const cardProjections: CardYearlyProjection[] = [];
    const totalByMonth = new Array<number>(12).fill(0);
    const paymentDueByMonth = new Array<number>(12).fill(0);
    let totalMaxDebt = 0;
    let totalMaxPaymentDue = 0;

    for (const card of cards) {
      const cardMsiTransactions = msiTransactions.filter((t) => t.cardId === card.id);
      const projection = this.calculateCardYearlyProjection(cardMsiTransactions, year);

      const maxDebt = Math.max(...projection.map((p) => p.totalDebt), 0);
      const maxPaymentDue = Math.max(...projection.map((p) => p.monthlyPaymentDue), 0);
      totalMaxDebt = Math.max(totalMaxDebt, maxDebt);
      totalMaxPaymentDue = Math.max(totalMaxPaymentDue, maxPaymentDue);
      projection.forEach((p, index) => {
        totalByMonth[index] += p.totalDebt;
        paymentDueByMonth[index] += p.monthlyPaymentDue;
      });

      cardProjections.push({
        cardId: card.id,
        cardName: card.name,
        network: card.network,
        last4: card.last4,
        maxDebt,
        maxPaymentDue,
        projection,
      });
    }

    return {
      year,
      cards: cardProjections,
      totalMaxDebt,
      totalMaxPaymentDue,
      totalByMonth,
      paymentDueByMonth,
    };
  }

  /** Groups installment rows (parent + children) by their MSI group, keyed
   * by the parent transaction's id (`parentTransactionId ?? id`). */
  private groupMsiTransactions(transactions: Transaction[]): Map<string, Transaction[]> {
    const groups = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const groupId = t.parentTransactionId ?? t.id;
      const existing = groups.get(groupId);
      if (existing) {
        existing.push(t);
      } else {
        groups.set(groupId, [t]);
      }
    }
    return groups;
  }

  /** Remaining debt for a single MSI group as of a given month: the sum of
   * the actual installment amounts that haven't been billed yet (date >=
   * start of asOfMonth). Computed once per group — never once per row —
   * which is what a previous version of this projection got wrong. */
  private calculateGroupRemainingDebt(
    installments: Transaction[],
    asOfMonth: Date,
  ): { remainingDebt: number; remainingMonths: number } {
    const monthStart = new Date(asOfMonth.getFullYear(), asOfMonth.getMonth(), 1);
    const remaining = installments.filter((t) => {
      const d = new Date(t.date);
      const installmentMonthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      return installmentMonthStart >= monthStart;
    });

    return {
      remainingDebt: remaining.reduce((sum, t) => sum + Number(t.amount), 0),
      remainingMonths: remaining.length,
    };
  }

  private calculateCardYearlyProjection(
    msiTransactions: Transaction[],
    year: number,
  ): MonthProjection[] {
    const groups = this.groupMsiTransactions(msiTransactions);
    const projections: MonthProjection[] = [];

    for (let month = 1; month <= 12; month++) {
      const monthDate = new Date(year, month - 1, 1);
      const msiDetails: MsiDetail[] = [];
      let msiDebt = 0;
      let monthlyPaymentDue = 0;

      for (const installments of groups.values()) {
        const sorted = [...installments].sort(
          (a, b) => (a.installmentCurrent ?? 0) - (b.installmentCurrent ?? 0),
        );

        // calculateGroupRemainingDebt only looks forward from monthDate — on
        // its own it can't tell "every installment is still ahead of us
        // because the purchase hasn't happened yet" apart from "every
        // installment is still ahead of us because we're mid-plan". Skip
        // groups whose first installment is still in the future relative to
        // this projected month, otherwise a purchase made in June would
        // incorrectly show its full balance as debt back in January too.
        const firstInstallmentDate = new Date(sorted[0].date);
        const firstInstallmentMonthStart = new Date(
          firstInstallmentDate.getFullYear(),
          firstInstallmentDate.getMonth(),
          1,
        );
        if (firstInstallmentMonthStart > monthDate) {
          continue;
        }

        const { remainingDebt, remainingMonths } = this.calculateGroupRemainingDebt(
          sorted,
          monthDate,
        );

        if (remainingMonths > 0) {
          msiDebt += remainingDebt;

          const parent = sorted.find((t) => !t.parentTransactionId) ?? sorted[0];
          const totalMonths = parent.installmentMonths ?? sorted.length;
          const nonLastInstallment =
            sorted.find((t) => (t.installmentCurrent ?? 0) < totalMonths) ?? sorted[0];

          // Every month from a group's start to its end has exactly one
          // installment (they're generated one per billing cycle), so this
          // is either that installment's amount or 0 if — despite the group
          // still having a remaining balance overall — this exact month
          // doesn't fall within it (shouldn't happen in practice, but the
          // filter is the source of truth either way).
          const amountDueThisMonth = sorted
            .filter((t) => {
              const d = new Date(t.date);
              return d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth();
            })
            .reduce((sum, t) => sum + Number(t.amount), 0);
          monthlyPaymentDue += amountDueThisMonth;

          msiDetails.push({
            transactionId: parent.id,
            description: parent.description.replace(INSTALLMENT_SUFFIX_PATTERN, ''),
            monthlyAmount: Number(nonLastInstallment.amount),
            remainingMonths,
            totalMonths,
            amountDueThisMonth,
          });
        }
      }

      projections.push({
        month,
        totalDebt: msiDebt,
        msiDebt,
        monthlyPaymentDue,
        msiDetails,
        isPaidOff: msiDebt === 0,
      });
    }

    return projections;
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

  private toIsoDate(date: Date | string): string {
    return new Date(date).toISOString().split('T')[0];
  }
}
