import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Sequelize } from 'sequelize-typescript';
import { Card, CardType, CardStatus } from './models/card.model';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardsService {
  constructor(
    @Inject(DATABASE_PROVIDER)
    private readonly sequelize: Sequelize,
  ) {}

  async create(userId: string, createCardDto: CreateCardDto): Promise<Card> {
    this.validateCreditCardFields(createCardDto);

    return Card.create({
      ...createCardDto,
      userId,
    });
  }

  async findAll(userId: string): Promise<Card[]> {
    return Card.findAll({
      where: { userId, status: CardStatus.ACTIVE },
      order: [['name', 'ASC']],
    });
  }

  async findOne(id: string, userId: string): Promise<Card> {
    const card = await Card.findOne({
      where: { id, userId },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return card;
  }

  async update(
    id: string,
    userId: string,
    updateCardDto: UpdateCardDto,
  ): Promise<Card> {
    const card = await this.findOne(id, userId);

    if (updateCardDto.type) {
      this.validateCreditCardFields({
        ...card.toJSON(),
        ...updateCardDto,
      } as CreateCardDto);
    }

    await card.update(updateCardDto);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const card = await this.findOne(id, userId);
    await card.update({ status: CardStatus.INACTIVE });
  }

  private validateCreditCardFields(dto: CreateCardDto): void {
    if (dto.type === CardType.CREDIT) {
      if (!dto.creditLimit || dto.creditLimit <= 0) {
        throw new BadRequestException(
          'Credit cards require a positive credit limit',
        );
      }
      if (!dto.billingCutoffDay) {
        throw new BadRequestException(
          'Credit cards require a billing cutoff day',
        );
      }
      if (!dto.paymentDueType) {
        throw new BadRequestException(
          'Credit cards require a payment due type',
        );
      }
      if (!dto.paymentDueValue) {
        throw new BadRequestException(
          'Credit cards require a payment due value',
        );
      }
    }
  }
}
