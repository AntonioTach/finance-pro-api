import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Sequelize } from 'sequelize-typescript';
import { Transaction, TransactionType } from '../transactions/models/transaction.model';
import { Category } from '../categories/models/category.model';
import { ReportFilterDto, ReportGranularity } from './dto/report-filter.dto';
import { buildTransactionWhere } from '../common/utils/transaction-where.builder';
import { Op } from 'sequelize';

const CATEGORY_BREAKDOWN_TOP_N = 7;
const OTHER_CATEGORY_COLOR = '#94a3b8';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DATABASE_PROVIDER)
    private readonly sequelize: Sequelize,
  ) {}

  async getMonthlyReport(userId: string, filters: ReportFilterDto) {
    // No default date range on purpose — an absent filter means "all time",
    // the same semantics the transactions table and getTrends use, so the KPI
    // row always agrees with what's on screen instead of silently narrowing
    // to the current month.
    const where = buildTransactionWhere(userId, filters);

    const transactions = await Transaction.findAll({ where, raw: true });

    const incomeRows = transactions.filter((t: any) => t.type === TransactionType.INCOME);
    const expenseRows = transactions.filter(
      (t: any) => t.type === TransactionType.EXPENSE || t.type === TransactionType.CARD_PAYMENT,
    );

    const totalIncome = incomeRows.reduce((sum, t: any) => sum + Number(t.amount), 0);
    const totalExpenses = expenseRows.reduce((sum, t: any) => sum + Number(t.amount), 0);

    return {
      period: {
        startDate: filters.startDate ?? null,
        endDate: filters.endDate ?? null,
      },
      summary: {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        transactionCount: transactions.length,
        incomeCount: incomeRows.length,
        expenseCount: expenseRows.length,
      },
    };
  }

  async getByCategory(userId: string, filters: ReportFilterDto) {
    // Same "no filter = all time" rule as getMonthlyReport above.
    const where = buildTransactionWhere(userId, filters);

    if (!filters.type) {
      (where as any).type = { [Op.in]: [TransactionType.EXPENSE, TransactionType.CARD_PAYMENT] };
    }

    const results = await Transaction.findAll({
      where,
      attributes: [
        'categoryId',
        [this.sequelize.fn('SUM', this.sequelize.col('amount')), 'total'],
        // Must qualify with the table alias — bare "id" is ambiguous once the
        // Category join is in scope (both tables have an id column), which
        // this query never surfaced before since nothing called this endpoint.
        [this.sequelize.fn('COUNT', this.sequelize.col('Transaction.id')), 'count'],
      ],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon', 'type'],
        },
      ],
      group: [
        'categoryId',
        'category.id',
        'category.name',
        'category.color',
        'category.icon',
        'category.type',
      ],
      order: [[this.sequelize.fn('SUM', this.sequelize.col('amount')), 'DESC']],
    });

    const rows = results.map((result: any) => ({
      categoryId: result.categoryId,
      categoryName: result.category?.name ?? 'Uncategorized',
      categoryColor: result.category?.color ?? OTHER_CATEGORY_COLOR,
      categoryIcon: result.category?.icon ?? 'pi-question-circle',
      categoryType: result.category?.type,
      amount: Number(result.get('total')),
      transactionCount: Number(result.get('count')),
    }));

    const grandTotal = rows.reduce((sum, r) => sum + r.amount, 0);

    const top = rows.slice(0, CATEGORY_BREAKDOWN_TOP_N);
    const tail = rows.slice(CATEGORY_BREAKDOWN_TOP_N);

    const breakdown = top.map((r) => ({
      ...r,
      percentage: grandTotal > 0 ? (r.amount / grandTotal) * 100 : 0,
    }));

    if (tail.length > 0) {
      const otherAmount = tail.reduce((sum, r) => sum + r.amount, 0);
      const otherCount = tail.reduce((sum, r) => sum + r.transactionCount, 0);
      breakdown.push({
        categoryId: 'other',
        categoryName: 'Other',
        categoryColor: OTHER_CATEGORY_COLOR,
        categoryIcon: 'pi-ellipsis-h',
        categoryType: tail[0]?.categoryType,
        amount: otherAmount,
        transactionCount: otherCount,
        percentage: grandTotal > 0 ? (otherAmount / grandTotal) * 100 : 0,
      });
    }

    return breakdown;
  }

  async getTrends(userId: string, filters: ReportFilterDto) {
    const hasExplicitRange = !!(filters.startDate || filters.endDate);
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const granularity: ReportGranularity =
      filters.granularity ?? this.resolveGranularity(startDate, endDate, hasExplicitRange);

    const where = buildTransactionWhere(userId, filters);

    const results = await Transaction.findAll({
      where,
      attributes: [
        [this.sequelize.fn('DATE_TRUNC', granularity, this.sequelize.col('date')), 'bucket'],
        'type',
        [this.sequelize.fn('SUM', this.sequelize.col('amount')), 'total'],
      ],
      group: [
        this.sequelize.fn('DATE_TRUNC', granularity, this.sequelize.col('date')),
        'type',
      ],
      order: [
        [this.sequelize.fn('DATE_TRUNC', granularity, this.sequelize.col('date')), 'ASC'],
      ],
      raw: true,
    });

    const buckets: Record<string, { income: number; expenses: number }> = {};
    results.forEach((result: any) => {
      const bucketKey = new Date(result.bucket).toISOString();
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = { income: 0, expenses: 0 };
      }
      if (result.type === TransactionType.INCOME) {
        buckets[bucketKey].income += Number(result.total);
      } else if (
        result.type === TransactionType.EXPENSE ||
        result.type === TransactionType.CARD_PAYMENT
      ) {
        buckets[bucketKey].expenses += Number(result.total);
      }
    });

    return Object.keys(buckets)
      .sort()
      .map((date) => ({
        date,
        income: buckets[date].income,
        expenses: buckets[date].expenses,
        balance: buckets[date].income - buckets[date].expenses,
      }));
  }

  private resolveGranularity(
    startDate: Date,
    endDate: Date,
    hasExplicitRange: boolean,
  ): ReportGranularity {
    if (!hasExplicitRange) {
      return 'month';
    }
    const spanDays = Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (spanDays <= 31) return 'day';
    if (spanDays <= 180) return 'week';
    return 'month';
  }
}
