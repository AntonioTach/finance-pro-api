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
import { DebtPayment } from './debt-payment.model';

export enum DebtDirection {
  OWED_BY_ME = 'owed_by_me',
  OWED_TO_ME = 'owed_to_me',
}

export enum DebtStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Table({
  tableName: 'debts',
  underscored: true,
})
export class Debt extends Model {
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
    type: DataType.ENUM(...Object.values(DebtDirection)),
    allowNull: false,
  })
  direction: DebtDirection;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  counterparty: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  description: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    field: 'total_amount',
  })
  totalAmount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  installments: number | null;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
    field: 'interest_rate',
  })
  interestRate: number | null;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
    field: 'start_date',
  })
  startDate: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
    field: 'due_date',
  })
  dueDate: string | null;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes: string | null;

  @Default(DebtStatus.ACTIVE)
  @Column({
    type: DataType.ENUM(...Object.values(DebtStatus)),
    allowNull: false,
  })
  status: DebtStatus;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt: Date;

  @BelongsTo(() => User)
  user: User;

  @HasMany(() => DebtPayment, { onDelete: 'CASCADE' })
  payments: DebtPayment[];
}
