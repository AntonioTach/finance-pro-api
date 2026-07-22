import { Op, WhereOptions } from 'sequelize';
import { TransactionQueryFiltersDto } from '../dto/transaction-query-filters.dto';

export function buildTransactionWhere(
  userId: string,
  filters: TransactionQueryFiltersDto,
): WhereOptions {
  const where: any = { userId };

  if (filters.startDate || filters.endDate) {
    where.date = {};
    if (filters.startDate) {
      where.date[Op.gte] = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.date[Op.lte] = new Date(filters.endDate);
    }
  }

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.cardId) {
    where.cardId = filters.cardId;
  }

  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    where.amount = {};
    if (filters.minAmount !== undefined) {
      where.amount[Op.gte] = filters.minAmount;
    }
    if (filters.maxAmount !== undefined) {
      where.amount[Op.lte] = filters.maxAmount;
    }
  }

  if (filters.search) {
    where[Op.or] = [
      { description: { [Op.iLike]: `%${filters.search}%` } },
      { notes: { [Op.iLike]: `%${filters.search}%` } },
    ];
  }

  return where;
}
