import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Sequelize } from 'sequelize-typescript';
import { Subscription } from './models/subscription.model';
import { Category } from '../categories/models/category.model';
import { Card } from '../cards/models/card.model';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

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
      ],
      order: [['name', 'ASC']],
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

    await subscription.update(updateSubscriptionDto);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const subscription = await this.findOne(id, userId);
    await subscription.destroy();
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
