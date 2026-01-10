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

export enum CardType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum CardNetwork {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  AMEX = 'amex',
  OTHER = 'other',
}

export enum CardStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum PaymentDueType {
  FIXED_DAY_OF_MONTH = 'fixed_day',
  DAYS_AFTER_CUTOFF = 'days_after',
}

@Table({
  tableName: 'cards',
  underscored: true,
})
export class Card extends Model {
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
    type: DataType.ENUM(...Object.values(CardType)),
    allowNull: false,
  })
  type: CardType;

  @Column({
    type: DataType.ENUM(...Object.values(CardNetwork)),
    allowNull: true,
  })
  network: CardNetwork;

  @Column({
    type: DataType.STRING(4),
    allowNull: true,
  })
  last4: string;

  @Default('MXN')
  @Column({
    type: DataType.STRING(3),
    allowNull: false,
  })
  currency: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
    field: 'credit_limit',
  })
  creditLimit: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'billing_cutoff_day',
    validate: {
      min: 1,
      max: 31,
    },
  })
  billingCutoffDay: number;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentDueType)),
    allowNull: true,
    field: 'payment_due_type',
  })
  paymentDueType: PaymentDueType;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'payment_due_value',
  })
  paymentDueValue: number;

  @Default(CardStatus.ACTIVE)
  @Column({
    type: DataType.ENUM(...Object.values(CardStatus)),
    allowNull: false,
  })
  status: CardStatus;

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
}
