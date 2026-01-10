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
import { Transaction } from '../../transactions/models/transaction.model';
import { Budget } from '../../budgets/models/budget.model';

export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

@Table({
  tableName: 'categories',
  underscored: true,
})
export class Category extends Model {
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
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.ENUM(...Object.values(CategoryType)),
    allowNull: false,
  })
  type: CategoryType;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  color: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  icon: string;

  @Default(false)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_default',
  })
  isDefault: boolean;

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

  @HasMany(() => Transaction)
  transactions: Transaction[];

  @HasMany(() => Budget)
  budgets: Budget[];
}

