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
import { Card, CardType } from '../cards/models/card.model';
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
    let card: Card | null = null;
    if (createTransactionDto.cardId) {
      card = await this.validateCardOwnership(userId, createTransactionDto.cardId);
      this.validateCardTransactionType(createTransactionDto.type);
    } else {
      this.validateNonCardTransactionType(createTransactionDto.type);
    }

    // Validate MSI requirements
    if (createTransactionDto.installmentMonths) {
      this.validateMsiRequirements(createTransactionDto, card);
    }

    // Create the main transaction
    const transaction = await Transaction.create({
      ...createTransactionDto,
      userId,
      date: new Date(createTransactionDto.date),
      installmentCurrent: createTransactionDto.installmentMonths ? 1 : null,
    });

    // Generate installments if MSI
    if (createTransactionDto.installmentMonths && card) {
      await this.generateInstallments(transaction, card, userId, createTransactionDto);
    }

    return transaction;
  }

  private validateMsiRequirements(
    dto: CreateTransactionDto,
    card: Card | null,
  ): void {
    if (!dto.cardId) {
      throw new BadRequestException('MSI purchases require a card');
    }
    if (dto.type !== TransactionType.CARD_PURCHASE) {
      throw new BadRequestException('MSI is only available for card purchases');
    }
    if (!card || card.type !== CardType.CREDIT) {
      throw new BadRequestException('MSI is only available for credit cards');
    }
    if (!card.billingCutoffDay) {
      throw new BadRequestException('Card must have a billing cutoff day configured for MSI');
    }
  }

  private async generateInstallments(
    parentTransaction: Transaction,
    card: Card,
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<void> {
    const totalMonths = dto.installmentMonths!;
    const monthlyAmount = Number((dto.amount / totalMonths).toFixed(2));
    const purchaseDate = new Date(dto.date);
    const cutoffDay = card.billingCutoffDay!;

    // Generate installments for months 2 to N (month 1 is the parent transaction)
    const installments: Partial<Transaction>[] = [];

    for (let month = 2; month <= totalMonths; month++) {
      const installmentDate = this.calculateInstallmentDate(purchaseDate, cutoffDay, month);
      
      installments.push({
        userId,
        type: TransactionType.CARD_PURCHASE,
        amount: monthlyAmount,
        categoryId: dto.categoryId,
        description: `${dto.description} (${month}/${totalMonths})`,
        date: installmentDate,
        notes: dto.notes,
        cardId: dto.cardId,
        installmentMonths: totalMonths,
        installmentCurrent: month,
        parentTransactionId: parentTransaction.id,
      });
    }

    // Update parent transaction description and amount for first installment
    await parentTransaction.update({
      amount: monthlyAmount,
      description: `${dto.description} (1/${totalMonths})`,
    });

    // Bulk create all installments
    if (installments.length > 0) {
      await Transaction.bulkCreate(installments as any[]);
    }
  }

  private calculateInstallmentDate(
    purchaseDate: Date,
    cutoffDay: number,
    installmentMonth: number,
  ): Date {
    // Calculate which billing cycle this installment falls into
    // If purchase is before cutoff, first charge is current month's cycle
    // If purchase is on/after cutoff, first charge is next month's cycle
    
    const purchaseDay = purchaseDate.getDate();
    const isBeforeCutoff = purchaseDay < cutoffDay;
    
    // Month offset: installmentMonth - 1 because first installment is current cycle
    // Plus 1 if purchase is on/after cutoff (charges start next cycle)
    const monthOffset = (installmentMonth - 1) + (isBeforeCutoff ? 0 : 1);
    
    const installmentDate = new Date(purchaseDate);
    installmentDate.setMonth(installmentDate.getMonth() + monthOffset);
    installmentDate.setDate(cutoffDay);
    
    return installmentDate;
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
    
    // If this is an MSI parent transaction, also delete all installments
    if (transaction.installmentMonths && !transaction.parentTransactionId) {
      await Transaction.destroy({
        where: {
          parentTransactionId: transaction.id,
          userId,
        },
      });
    }
    
    await transaction.destroy();
  }

  async getMsiGroup(
    id: string,
    userId: string,
  ): Promise<{ parent: Transaction; installments: Transaction[] }> {
    const transaction = await this.findOne(id, userId);
    
    // Determine the parent transaction ID
    const parentId = transaction.parentTransactionId || transaction.id;
    
    // Get the parent transaction
    const parent = await Transaction.findOne({
      where: { id: parentId, userId },
      include: [
        { model: Category, as: 'category' },
        { model: Card, as: 'card' },
      ],
    });

    if (!parent) {
      throw new NotFoundException('Parent transaction not found');
    }

    // Get all installments
    const installments = await Transaction.findAll({
      where: {
        [Op.or]: [
          { id: parentId },
          { parentTransactionId: parentId },
        ],
        userId,
      },
      include: [
        { model: Category, as: 'category' },
        { model: Card, as: 'card' },
      ],
      order: [['installmentCurrent', 'ASC']],
    });

    return { parent, installments };
  }

  async cancelMsi(
    id: string,
    userId: string,
  ): Promise<{ deletedCount: number; remainingTransaction: Transaction }> {
    const { parent, installments } = await this.getMsiGroup(id, userId);
    
    if (!parent.installmentMonths) {
      throw new BadRequestException('This transaction is not an MSI purchase');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find future installments to delete
    const futureInstallments = installments.filter((t) => {
      const transactionDate = new Date(t.date);
      transactionDate.setHours(0, 0, 0, 0);
      return transactionDate > today && t.id !== parent.id;
    });

    // Delete future installments
    const deletedCount = futureInstallments.length;
    if (deletedCount > 0) {
      await Transaction.destroy({
        where: {
          id: futureInstallments.map((t) => t.id),
          userId,
        },
      });
    }

    // Update parent to reflect cancellation
    const paidInstallments = installments.length - deletedCount;
    const baseDescription = parent.description.replace(/\s*\(\d+\/\d+\)\s*$/, '');
    
    await parent.update({
      description: `${baseDescription} (MSI cancelado - ${paidInstallments} pagos realizados)`,
      notes: `${parent.notes || ''}\nMSI cancelado el ${new Date().toLocaleDateString('es-MX')}. Se eliminaron ${deletedCount} cuotas pendientes.`.trim(),
    });

    return {
      deletedCount,
      remainingTransaction: await this.findOne(parent.id, userId),
    };
  }

  async updateMsiGroup(
    id: string,
    userId: string,
    updates: { description?: string; notes?: string; categoryId?: string },
  ): Promise<Transaction[]> {
    const { installments } = await this.getMsiGroup(id, userId);
    
    if (updates.categoryId) {
      await this.validateCategoryOwnership(userId, updates.categoryId);
    }

    // Update all installments
    const updateData: Record<string, unknown> = {};
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.categoryId) updateData.categoryId = updates.categoryId;

    // For description, we need to preserve the installment numbering
    for (const transaction of installments) {
      const individualUpdate: Record<string, unknown> = { ...updateData };
      
      if (updates.description !== undefined) {
        // Extract current numbering from description
        const match = transaction.description.match(/\((\d+)\/(\d+)\)$/);
        if (match) {
          individualUpdate.description = `${updates.description} (${match[1]}/${match[2]})`;
        } else {
          individualUpdate.description = updates.description;
        }
      }

      await transaction.update(individualUpdate);
    }

    // Return updated installments
    return (await this.getMsiGroup(id, userId)).installments;
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
  ): Promise<Card> {
    const card = await Card.findByPk(cardId);
    if (!card) {
      throw new NotFoundException('Card not found');
    }
    if (card.userId !== userId) {
      throw new ForbiddenException('Card does not belong to user');
    }
    return card;
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

