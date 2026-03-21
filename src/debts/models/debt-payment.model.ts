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
import { Debt } from './debt.model';
import { Transaction } from '../../transactions/models/transaction.model';

@Table({
  tableName: 'debt_payments',
  underscored: true,
})
export class DebtPayment extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Debt)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'debt_id',
  })
  debtId: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
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
    allowNull: true,
    field: 'installment_number',
  })
  installmentNumber: number | null;

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

  @BelongsTo(() => Debt)
  debt: Debt;

  @BelongsTo(() => Transaction)
  transaction: Transaction;
}
