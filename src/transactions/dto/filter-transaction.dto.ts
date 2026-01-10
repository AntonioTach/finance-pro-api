import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { TransactionType } from '../models/transaction.model';

export class FilterTransactionDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsUUID()
  @IsOptional()
  categoryId?: string;
}

