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
import { Subscription } from './subscription.model';

@Table({
  tableName: 'subscription_price_history',
  underscored: true,
})
export class SubscriptionPriceHistory extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Subscription)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'subscription_id',
  })
  subscriptionId: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    field: 'previous_amount',
  })
  previousAmount: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    field: 'new_amount',
  })
  newAmount: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'changed_at',
  })
  changedAt: Date;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt: Date;

  @BelongsTo(() => Subscription)
  subscription: Subscription;
}
