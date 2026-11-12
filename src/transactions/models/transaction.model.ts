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
  BeforeCreate,
} from 'sequelize-typescript';
import { CreateOptions } from 'sequelize';
import { User } from '../../users/models/user.model';
import { Category } from '../../categories/models/category.model';
import { Card } from '../../cards/models/card.model';
import { Account } from '../../accounts/models/account.model';
import { resolveTransactionAccountId } from '../../accounts/account-resolution';

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

  /**
   * Account this movement takes money from / puts money into. Set iff the
   * transaction moves real money (income, expense, card payment, debit-card
   * purchase); null for credit-card purchases. Assigned automatically on
   * create — see resolveTransactionAccountId.
   */
  @ForeignKey(() => Account)
  @Column({
    type: DataType.UUID,
    allowNull: true,
    field: 'account_id',
  })
  accountId: string | null;

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

  @BelongsTo(() => Account)
  account: Account;

  @BelongsTo(() => Transaction, 'parentTransactionId')
  parentTransaction: Transaction;

  @HasMany(() => Transaction, 'parentTransactionId')
  installments: Transaction[];

  // Single choke point for the account invariant: every code path that
  // creates a transaction (transactions, debts, subscriptions, auto-charge)
  // goes through Transaction.create, so the rule lives here once.
  @BeforeCreate
  static async assignAccount(instance: Transaction, options: CreateOptions): Promise<void> {
    instance.accountId = await resolveTransactionAccountId(
      {
        userId: instance.userId,
        type: instance.type,
        cardId: instance.cardId,
        accountId: instance.accountId,
      },
      options.transaction ?? undefined,
    );
  }
}
