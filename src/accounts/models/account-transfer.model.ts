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
import { User } from '../../users/models/user.model';
import { Account } from './account.model';

/**
 * Money moved between two of the user's accounts (ATM withdrawal, moving
 * money to a digital wallet…). Not income nor expense, so it never shows up
 * in reports or budgets — it only shifts balances.
 */
@Table({
  tableName: 'account_transfers',
  underscored: true,
})
export class AccountTransfer extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, field: 'user_id' })
  userId: string;

  @ForeignKey(() => Account)
  @Column({ type: DataType.UUID, allowNull: false, field: 'from_account_id' })
  fromAccountId: string;

  @ForeignKey(() => Account)
  @Column({ type: DataType.UUID, allowNull: false, field: 'to_account_id' })
  toAccountId: string;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
  amount: number;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  date: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes: string | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt: Date;

  @BelongsTo(() => Account, 'fromAccountId')
  fromAccount: Account;

  @BelongsTo(() => Account, 'toAccountId')
  toAccount: Account;
}
