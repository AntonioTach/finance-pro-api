import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Sequelize } from 'sequelize-typescript';
import { Budget } from './models/budget.model';
import { Category } from '../categories/models/category.model';
import { Transaction } from '../transactions/models/transaction.model';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { Op } from 'sequelize';

@Injectable()
export class BudgetsService {
  constructor(
    @Inject(DATABASE_PROVIDER)
    private readonly sequelize: Sequelize,
  ) {}

  async create(
    userId: string,
    createBudgetDto: CreateBudgetDto,
  ): Promise<Budget> {
    await this.validateCategoryOwnership(userId, createBudgetDto.categoryId);

    return Budget.create({
      ...createBudgetDto,
      userId,
      startDate: new Date(createBudgetDto.startDate),
      endDate: createBudgetDto.endDate ? new Date(createBudgetDto.endDate) : null,
    });
  }

  async findAll(userId: string): Promise<Budget[]> {
    return Budget.findAll({
      where: { userId },
      include: [
        {
          model: Category,
          as: 'category',
        },
      ],
      order: [['startDate', 'DESC']],
    });
  }

  async findOne(id: string, userId: string): Promise<Budget> {
    const budget = await Budget.findOne({
      where: { id, userId },
      include: [
        {
          model: Category,
          as: 'category',
        },
      ],
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    return budget;
  }

  async update(
    id: string,
    userId: string,
    updateBudgetDto: UpdateBudgetDto,
  ): Promise<Budget> {
    const budget = await this.findOne(id, userId);

    if (updateBudgetDto.categoryId) {
      await this.validateCategoryOwnership(
        userId,
        updateBudgetDto.categoryId,
      );
    }

    if (updateBudgetDto.startDate) {
      updateBudgetDto.startDate = new Date(updateBudgetDto.startDate) as any;
    }
    if (updateBudgetDto.endDate) {
      updateBudgetDto.endDate = new Date(updateBudgetDto.endDate) as any;
    }

    await budget.update(updateBudgetDto);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const budget = await this.findOne(id, userId);
    await budget.destroy();
  }

  async getProgress(id: string, userId: string): Promise<any> {
    const budget = await this.findOne(id, userId);
    
    const startDate = budget.startDate;
    const endDate = budget.endDate || new Date();

    const transactions: any[] = await Transaction.findAll({
      where: {
        userId,
        categoryId: budget.categoryId,
        type: 'expense',
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      attributes: [
        [
          this.sequelize.fn('SUM', this.sequelize.col('amount')),
          'total',
        ],
      ],
      raw: true,
    });

    const spent = Number(transactions[0]?.total || 0);
    const amount = Number(budget.amount);
    const remaining = amount - spent;
    const percentage = amount > 0 ? (spent / amount) * 100 : 0;

    return {
      budget: {
        id: budget.id,
        amount,
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate,
        category: budget.category,
      },
      spent,
      remaining,
      percentage: Math.min(percentage, 100),
      isExceeded: spent > amount,
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

