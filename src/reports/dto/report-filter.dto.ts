import { IsOptional, IsIn } from 'class-validator';
import { TransactionQueryFiltersDto } from '../../common/dto/transaction-query-filters.dto';

const GRANULARITIES = ['day', 'week', 'month'] as const;
export type ReportGranularity = (typeof GRANULARITIES)[number];

export class ReportFilterDto extends TransactionQueryFiltersDto {
  @IsIn(GRANULARITIES)
  @IsOptional()
  granularity?: ReportGranularity;
}
