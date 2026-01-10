import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from './models/transaction.model';
import { Category } from '../categories/models/category.model';
import { User } from '../users/models/user.model';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { Op } from 'sequelize';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(DATABASE_PROVIDER)
    private readonly sequelize: Sequelize,
  ) {}

  async create(
    userId: string,
    createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction> {
    await this.validateCategoryOwnership(userId, createTransactionDto.categoryId);

    return Transaction.create({
      ...createTransactionDto,
      userId,
      date: new Date(createTransactionDto.date),
    });
  }

  async findAll(
    userId: string,
    filters: FilterTransactionDto,
  ): Promise<Transaction[]> {
    const where: any = { userId };

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date[Op.gte] = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date[Op.lte] = new Date(filters.endDate);
      }
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    return Transaction.findAll({
      where,
      include: [
        {
          model: Category,
          as: 'category',
        },
      ],
      order: [['date', 'DESC']],
    });
  }

  async findOne(id: string, userId: string): Promise<Transaction> {
    const transaction = await Transaction.findOne({
      where: { id, userId },
      include: [
        {
          model: Category,
          as: 'category',
        },
      ],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async update(
    id: string,
    userId: string,
    updateTransactionDto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const transaction = await this.findOne(id, userId);

    if (updateTransactionDto.categoryId) {
      await this.validateCategoryOwnership(
        userId,
        updateTransactionDto.categoryId,
      );
    }

    if (updateTransactionDto.date) {
      updateTransactionDto.date = new Date(updateTransactionDto.date) as any;
    }

    await transaction.update(updateTransactionDto);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const transaction = await this.findOne(id, userId);
    await transaction.destroy();
  }

  async getSummary(userId: string): Promise<any> {
    const transactions: any[] = await Transaction.findAll({
      where: { userId },
      attributes: [
        'type',
        [
          this.sequelize.fn('SUM', this.sequelize.col('amount')),
          'total',
        ],
      ],
      group: ['type'],
      raw: true,
    });

    const income = transactions.find((t) => t.type === 'income')?.total || 0;
    const expense = transactions.find((t) => t.type === 'expense')?.total || 0;
    const balance = Number(income) - Number(expense);

    return {
      income: Number(income),
      expense: Number(expense),
      balance,
    };
  }

  private async validateCategoryOwnership(
    userId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (category.userId !== userId) {
      throw new ForbiddenException('Category does not belong to user');
    }
  }
}

