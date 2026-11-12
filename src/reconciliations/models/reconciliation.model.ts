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
import { ReconciliationItem } from './reconciliation-item.model';

/**
 * A reconciliation session: on `date` the user recorded the real balances of
 * some accounts / real current debt of some credit cards. Covers everything
 * up to the END of `date`.
 */
@Table({
  tableName: 'reconciliations',
  underscored: true,
})
export class Reconciliation extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, field: 'user_id' })
  userId: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  date: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes: string | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt: Date;

  @BelongsTo(() => User)
  user: User;

  @HasMany(() => ReconciliationItem)
  items: ReconciliationItem[];
}
