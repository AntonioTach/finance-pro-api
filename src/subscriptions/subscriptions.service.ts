import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Sequelize } from 'sequelize-typescript';
import { Subscription } from './models/subscription.model';
import { SubscriptionPayment } from './models/subscription-payment.model';
import { SubscriptionPriceHistory } from './models/subscription-price-history.model';
import { Transaction, TransactionType } from '../transactions/models/transaction.model';
import { Category } from '../categories/models/category.model';
import { Card } from '../cards/models/card.model';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payment.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @Inject(DATABASE_PROVIDER)
    private readonly sequelize: Sequelize,
  ) {}

  async create(
    userId: string,
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    await this.validateCategoryOwnership(userId, createSubscriptionDto.categoryId);

    if (createSubscriptionDto.cardId) {
      await this.validateCardOwnership(userId, createSubscriptionDto.cardId);
    }

    return Subscription.create({
      ...createSubscriptionDto,
      userId,
    });
  }

  async findAll(userId: string): Promise<Subscription[]> {
    return Subscription.findAll({
      where: { userId },
      include: [
        {
          model: Category,
          as: 'category',
        },
        {
          model: Card,
          as: 'card',
        },
        {
          model: SubscriptionPayment,
          as: 'payments',
        },
        {
          model: SubscriptionPriceHistory,
          as: 'priceHistory',
        },
      ],
      order: [
        ['name', 'ASC'],
        [{ model: SubscriptionPayment, as: 'payments' }, 'payment_date', 'DESC'],
        [{ model: SubscriptionPriceHistory, as: 'priceHistory' }, 'changed_at', 'DESC'],
      ],
    });
  }

  async findOne(id: string, userId: string): Promise<Subscription> {
    const subscription = await Subscription.findOne({
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
        {
          model: SubscriptionPayment,
          as: 'payments',
        },
        {
          model: SubscriptionPriceHistory,
          as: 'priceHistory',
        },
      ],
      order: [
        [{ model: SubscriptionPayment, as: 'payments' }, 'payment_date', 'DESC'],
        [{ model: SubscriptionPriceHistory, as: 'priceHistory' }, 'changed_at', 'DESC'],
      ],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async update(
    id: string,
    userId: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.findOne(id, userId);

    if (updateSubscriptionDto.categoryId) {
      await this.validateCategoryOwnership(userId, updateSubscriptionDto.categoryId);
    }

    if (updateSubscriptionDto.cardId) {
      await this.validateCardOwnership(userId, updateSubscriptionDto.cardId);
    }

    if (
      updateSubscriptionDto.amount !== undefined &&
      Number(updateSubscriptionDto.amount) !== Number(subscription.amount)
    ) {
      await SubscriptionPriceHistory.create({
        subscriptionId: id,
        previousAmount: subscription.amount,
        newAmount: updateSubscriptionDto.amount,
        changedAt: new Date(),
      });
    }

    await subscription.update(updateSubscriptionDto);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const subscription = await this.findOne(id, userId);
    await subscription.destroy();
  }

  async addPayment(
    id: string,
    userId: string,
    dto: CreateSubscriptionPaymentDto,
  ): Promise<Subscription> {
    const subscription = await this.findOne(id, userId);
    const { periodYear, periodMonth } = this.getPeriod(dto.paymentDate);

    const existing = await SubscriptionPayment.findOne({
      where: { subscriptionId: id, periodYear, periodMonth },
    });
    if (existing) {
      throw new ConflictException('Payment already registered for this billing period');
    }

    const amount = dto.amount ?? subscription.amount;
    const categoryId = dto.categoryId ?? subscription.categoryId;
    const shouldCreateTx = dto.createTransaction !== false;
    let transactionId: string | null = null;

    if (shouldCreateTx) {
      const txType = subscription.cardId
        ? TransactionType.CARD_PURCHASE
        : TransactionType.EXPENSE;

      const transaction = await Transaction.create({
        userId,
        type: txType,
        amount,
        categoryId,
        cardId: subscription.cardId ?? null,
        description: subscription.name,
        date: new Date(dto.paymentDate + 'T12:00:00'),
        notes: dto.notes ?? `Pago de suscripción: ${subscription.name}`,
      });

      transactionId = transaction.id;
    }

    try {
      await SubscriptionPayment.create({
        subscriptionId: id,
        amount,
        paymentDate: dto.paymentDate,
        periodYear,
        periodMonth,
        isAutomatic: false,
        notes: dto.notes ?? null,
        transactionId,
      });
    } catch (err) {
      if (transactionId) {
        await Transaction.destroy({ where: { id: transactionId } });
      }
      throw new ConflictException('Payment already registered for this billing period');
    }

    return this.findOne(id, userId);
  }

  async removePayment(
    subscriptionId: string,
    paymentId: string,
    userId: string,
  ): Promise<Subscription> {
    await this.findOne(subscriptionId, userId);

    const payment = await SubscriptionPayment.findOne({
      where: { id: paymentId, subscriptionId },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.transactionId) {
      await Transaction.destroy({ where: { id: payment.transactionId } });
    }

    await payment.destroy();
    return this.findOne(subscriptionId, userId);
  }

  private getPeriod(paymentDate: string): { periodYear: number; periodMonth: number } {
    return {
      periodYear: Number(paymentDate.substring(0, 4)),
      periodMonth: Number(paymentDate.substring(5, 7)),
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
}
