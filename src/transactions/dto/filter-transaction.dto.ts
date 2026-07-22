import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionQueryFiltersDto } from '../../common/dto/transaction-query-filters.dto';

const SORTABLE_FIELDS = ['date', 'amount', 'description', 'createdAt'] as const;
export type TransactionSortField = (typeof SORTABLE_FIELDS)[number];

export class FilterTransactionDto extends TransactionQueryFiltersDto {
  // No default value on purpose: omitting page/limit entirely (existing callers
  // like the dashboard/cash-flow/reports features that want the FULL history)
  // must stay distinguishable from "page 1" at the service layer — see
  // TransactionsService.findAll, which only paginates when either is present.
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @IsIn(SORTABLE_FIELDS)
  @IsOptional()
  sortBy?: TransactionSortField = 'date';

  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
