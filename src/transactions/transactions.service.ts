import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Sequelize } from 'sequelize-typescript';
import { Transaction, TransactionType } from './models/transaction.model';
import { Category } from '../categories/models/category.model';
import { Card } from '../cards/models/card.model';
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

    // Validate card if provided
    if (createTransactionDto.cardId) {
      await this.validateCardOwnership(userId, createTransactionDto.cardId);
      this.validateCardTransactionType(createTransactionDto.type);
    } else {
      this.validateNonCardTransactionType(createTransactionDto.type);
    }

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
        {
          model: Card,
          as: 'card',
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
        {
          model: Card,
          as: 'card',
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

    if (updateTransactionDto.cardId) {
      await this.validateCardOwnership(userId, updateTransactionDto.cardId);
    }

    // Validate transaction type consistency
    const newType = updateTransactionDto.type || transaction.type;
    const newCardId = updateTransactionDto.cardId !== undefined 
      ? updateTransactionDto.cardId 
      : transaction.cardId;

    if (newCardId) {
      this.validateCardTransactionType(newType);
    } else {
      this.validateNonCardTransactionType(newType);
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

  private async validateCardOwnership(
    userId: string,
    cardId: string,
  ): Promise<void> {
    const card = await Card.findByPk(cardId);
    if (!card) {
      throw new NotFoundException('Card not found');
    }
    if (card.userId !== userId) {
      throw new ForbiddenException('Card does not belong to user');
    }
  }

  private validateCardTransactionType(type: TransactionType): void {
    const validCardTypes = [TransactionType.CARD_PURCHASE, TransactionType.CARD_PAYMENT];
    if (!validCardTypes.includes(type)) {
      throw new BadRequestException(
        'Card transactions must be of type CARD_PURCHASE or CARD_PAYMENT',
      );
    }
  }

  private validateNonCardTransactionType(type: TransactionType): void {
    const validNonCardTypes = [TransactionType.INCOME, TransactionType.EXPENSE];
    if (!validNonCardTypes.includes(type)) {
      throw new BadRequestException(
        'Non-card transactions must be of type INCOME or EXPENSE',
      );
    }
  }
}

