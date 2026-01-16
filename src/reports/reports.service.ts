import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from '../transactions/models/transaction.model';
import { Category } from '../categories/models/category.model';
import { ReportFilterDto } from './dto/report-filter.dto';
import { Op } from 'sequelize';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DATABASE_PROVIDER)
    private readonly sequelize: Sequelize,
  ) {}

  async getMonthlyReport(userId: string, filters: ReportFilterDto) {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = filters.endDate
      ? new Date(filters.endDate)
      : new Date();

    const transactions = await Transaction.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [
        {
          model: Category,
          as: 'category',
        },
      ],
      order: [['date', 'ASC']],
    });

    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = transactions
      .filter((t) => t.type === 'expense' || t.type === 'card_payment')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = income - expense;

    return {
      period: {
        startDate,
        endDate,
      },
      summary: {
        income,
        expense,
        balance,
        transactionCount: transactions.length,
      },
      transactions,
    };
  }

  async getByCategory(userId: string, filters: ReportFilterDto) {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = filters.endDate
      ? new Date(filters.endDate)
      : new Date();

    const results = await Transaction.findAll({
      where: {
        userId,
        type: { [Op.in]: ['expense', 'card_payment'] },
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      attributes: [
        'categoryId',
        [
          this.sequelize.fn('SUM', this.sequelize.col('amount')),
          'total',
        ],
        [
          this.sequelize.fn('COUNT', this.sequelize.col('id')),
          'count',
        ],
      ],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon'],
        },
      ],
      group: ['categoryId', 'category.id', 'category.name', 'category.color', 'category.icon'],
      order: [[this.sequelize.fn('SUM', this.sequelize.col('amount')), 'DESC']],
    });

    return results.map((result: any) => ({
      category: result.category,
      total: Number(result.get('total')),
      count: Number(result.get('count')),
    }));
  }

  async getTrends(userId: string, filters: ReportFilterDto) {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);
    const endDate = filters.endDate
      ? new Date(filters.endDate)
      : new Date();

    const results = await Transaction.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      attributes: [
        [
          this.sequelize.fn('DATE_TRUNC', 'month', this.sequelize.col('date')),
          'month',
        ],
        'type',
        [
          this.sequelize.fn('SUM', this.sequelize.col('amount')),
          'total',
        ],
      ],
      group: [
        this.sequelize.fn('DATE_TRUNC', 'month', this.sequelize.col('date')),
        'type',
      ],
      order: [
        [
          this.sequelize.fn('DATE_TRUNC', 'month', this.sequelize.col('date')),
          'ASC',
        ],
      ],
      raw: true,
    });

    const trends: any = {};
    results.forEach((result: any) => {
      const month = new Date(result.month).toISOString().substring(0, 7);
      if (!trends[month]) {
        trends[month] = { income: 0, expense: 0 };
      }
      
      // Treat card_payment as expense
      if (result.type === 'income') {
        trends[month].income += Number(result.total);
      } else if (result.type === 'expense' || result.type === 'card_payment') {
        trends[month].expense += Number(result.total);
      }
    });

    return Object.keys(trends).map((month) => ({
      month,
      income: trends[month].income,
      expense: trends[month].expense,
      balance: trends[month].income - trends[month].expense,
    }));
  }
}

