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
import { BudgetAlert } from './budget-alert.model';

export enum BudgetPeriod {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export enum BudgetAmountType {
  FIXED = 'fixed',
  PERCENT = 'percent',
}

@Table({
  tableName: 'budgets',
  underscored: true,
})
export class Budget extends Model {
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

  @ForeignKey(() => Category)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'category_id',
  })
  categoryId: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  name: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  amount: number;

  @Column({
    type: DataType.ENUM(...Object.values(BudgetPeriod)),
    allowNull: false,
  })
  period: BudgetPeriod;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'start_date',
  })
  startDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'end_date',
  })
  endDate: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
  })
  isActive: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 80,
    field: 'alert_threshold',
  })
  alertThreshold: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'rollover_enabled',
  })
  rolloverEnabled: boolean;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    field: 'rollover_amount',
  })
  rolloverAmount: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'auto_renew',
  })
  autoRenew: boolean;

  @Column({
    type: DataType.ENUM(...Object.values(BudgetAmountType)),
    allowNull: false,
    defaultValue: BudgetAmountType.FIXED,
    field: 'amount_type',
  })
  amountType: BudgetAmountType;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
    field: 'amount_percent',
  })
  amountPercent: number;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt: Date;

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Category)
  category: Category;

  @HasMany(() => BudgetAlert)
  alerts: BudgetAlert[];
}
