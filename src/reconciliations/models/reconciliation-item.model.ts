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
import { Reconciliation } from './reconciliation.model';
import { Account } from '../../accounts/models/account.model';
import { Card } from '../../cards/models/card.model';

export enum ReconciliationTargetType {
  ACCOUNT = 'account',
  CARD = 'card',
}

/**
 * One reconciled target inside a reconciliation. For an account, amounts are money on
 * hand; for a credit card, amounts are the CURRENT debt (excluding pending
 * future MSI installments).
 */
@Table({
  tableName: 'reconciliation_items',
  underscored: true,
})
export class ReconciliationItem extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Reconciliation)
  @Column({ type: DataType.UUID, allowNull: false, field: 'reconciliation_id' })
  reconciliationId: string;

  @Column({ type: DataType.ENUM(...Object.values(ReconciliationTargetType)), allowNull: false, field: 'target_type' })
  targetType: ReconciliationTargetType;

  @ForeignKey(() => Account)
  @Column({ type: DataType.UUID, allowNull: true, field: 'account_id' })
  accountId: string | null;

  @ForeignKey(() => Card)
  @Column({ type: DataType.UUID, allowNull: true, field: 'card_id' })
  cardId: string | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, field: 'computed_amount' })
  computedAmount: number;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, field: 'real_amount' })
  realAmount: number;

  /** real − computed. Negative = you have less money (or less debt) than recorded. */
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
  difference: number;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt: Date;

  @BelongsTo(() => Reconciliation)
  reconciliation: Reconciliation;

  @BelongsTo(() => Account)
  account: Account;

  @BelongsTo(() => Card)
  card: Card;
}
