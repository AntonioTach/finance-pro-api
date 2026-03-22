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

export enum BudgetAlertType {
  THRESHOLD_50 = 'threshold_50',
  THRESHOLD_80 = 'threshold_80',
  THRESHOLD_100 = 'threshold_100',
  EXCEEDED = 'exceeded',
  BURN_RATE = 'burn_rate',
  RENEWAL = 'renewal',
}

@Table({
  tableName: 'budget_alerts',
  underscored: true,
})
export class BudgetAlert extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Budget)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'budget_id',
  })
  budgetId: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'user_id',
  })
  userId: string;

  @Column({
    type: DataType.ENUM(...Object.values(BudgetAlertType)),
    allowNull: false,
  })
  type: BudgetAlertType;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'triggered_at',
  })
  triggeredAt: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_read',
  })
  isRead: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  message: string;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
  })
  percentage: number;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    field: 'period_key',
  })
  periodKey: string;

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
