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
import { Budget } from './budget.model';

@Table({
  tableName: 'budget_period_snapshots',
  underscored: true,
})
export class BudgetPeriodSnapshot extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Budget)
  @Column({ type: DataType.UUID, allowNull: false, field: 'budget_id' })
  budgetId: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, field: 'user_id' })
  userId: string;

  @Column({ type: DataType.DATEONLY, allowNull: false, field: 'period_start' })
  periodStart: string;

  @Column({ type: DataType.DATEONLY, allowNull: false, field: 'period_end' })
  periodEnd: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, field: 'budgeted_amount' })
  budgetedAmount: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'spent_amount' })
  spentAmount: number;

  /** Rollover received from the previous period */
  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'rollover_in' })
  rolloverIn: number;

  /** Surplus/deficit sent to the next period (positive = surplus, negative = deficit) */
  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'rollover_out' })
  rolloverOut: number;

  @Column({ type: DataType.DATE, allowNull: false, field: 'closed_at' })
  closedAt: Date;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt: Date;

  @BelongsTo(() => Budget)
  budget: Budget;

  @BelongsTo(() => User)
  user: User;
}
