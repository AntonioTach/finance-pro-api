import {
  Table,
  Column,
  Model,
  PrimaryKey,
  Default,
  DataType,
  CreatedAt,
  UpdatedAt,
  HasMany,
} from 'sequelize-typescript';
import { Transaction } from '../../transactions/models/transaction.model';
import { Category } from '../../categories/models/category.model';
import { Budget } from '../../budgets/models/budget.model';

@Table({
  tableName: 'users',
  underscored: true,
})
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password: string;

  @Default('USD')
  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'USD',
  })
  currency: string;

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

  @HasMany(() => Transaction)
  transactions: Transaction[];

  @HasMany(() => Category)
  categories: Category[];

  @HasMany(() => Budget)
  budgets: Budget[];
}

