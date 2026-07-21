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
} from 'sequelize-typescript';
import { Subscription } from './subscription.model';
import { Transaction } from '../../transactions/models/transaction.model';

@Table({
  tableName: 'subscription_payments',
  underscored: true,
})
export class SubscriptionPayment extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Subscription)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'subscription_id',
  })
  subscriptionId: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  amount: number;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
    field: 'payment_date',
  })
  paymentDate: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'period_year',
  })
  periodYear: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'period_month',
  })
  periodMonth: number;

  @Default(false)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    field: 'is_automatic',
  })
  isAutomatic: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes: string | null;

  @ForeignKey(() => Transaction)
  @Column({
    type: DataType.UUID,
    allowNull: true,
    field: 'transaction_id',
  })
  transactionId: string | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt: Date;

  @BelongsTo(() => Subscription)
  subscription: Subscription;

  @BelongsTo(() => Transaction)
  transaction: Transaction;
}
