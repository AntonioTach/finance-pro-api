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

export enum AccountType {
  CASH = 'cash',
  BANK = 'bank',
  DIGITAL_WALLET = 'digital_wallet',
  OTHER = 'other',
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Table({
  tableName: 'accounts',
  underscored: true,
})
export class Account extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, field: 'user_id' })
  userId: string;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Default(AccountType.CASH)
  @Column({ type: DataType.ENUM(...Object.values(AccountType)), allowNull: false })
  type: AccountType;

  @Default('MXN')
  @Column({ type: DataType.STRING(3), allowNull: false })
  currency: string;

  /** Starting balance used only while the account has never had a reconciliation. */
  @Default(0)
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, field: 'initial_balance' })
  initialBalance: number;

  @Default(false)
  @Column({ type: DataType.BOOLEAN, allowNull: false, field: 'is_default' })
  isDefault: boolean;

  @Default(AccountStatus.ACTIVE)
  @Column({ type: DataType.ENUM(...Object.values(AccountStatus)), allowNull: false })
  status: AccountStatus;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt: Date;

  @BelongsTo(() => User)
  user: User;
}
