import {
  Table,
  Column,
  Model,
  PrimaryKey,
  Default,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { User } from '../../users/models/user.model';
import { Category } from '../../categories/models/category.model';
import { Card } from '../../cards/models/card.model';

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  CARD_PURCHASE = 'card_purchase',
  CARD_PAYMENT = 'card_payment',
}

@Table({
  tableName: 'transactions',
  underscored: true,
})
export class Transaction extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'user_id',
  })
  userId: string;

  @Column({
    type: DataType.ENUM(...Object.values(TransactionType)),
    allowNull: false,
  })
  type: TransactionType;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  amount: number;

  @ForeignKey(() => Category)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'category_id',
  })
  categoryId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  description: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  date: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes: string;

  @ForeignKey(() => Card)
  @Column({
    type: DataType.UUID,
    allowNull: true,
    field: 'card_id',
  })
  cardId: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'installment_months',
  })
  installmentMonths: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'installment_current',
  })
  installmentCurrent: number;

  @ForeignKey(() => Transaction)
  @Column({
    type: DataType.UUID,
    allowNull: true,
    field: 'parent_transaction_id',
  })
  parentTransactionId: string;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    field: 'created_at',
  })
  createdAt: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    field: 'updated_at',
  })
  updatedAt: Date;

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Category)
  category: Category;

  @BelongsTo(() => Card)
  card: Card;

  @BelongsTo(() => Transaction, 'parentTransactionId')
  parentTransaction: Transaction;

  @HasMany(() => Transaction, 'parentTransactionId')
  installments: Transaction[];
}

