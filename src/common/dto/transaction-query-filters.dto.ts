import { IsOptional, IsEnum, IsUUID, IsDateString, IsString, IsNumber, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '../../transactions/models/transaction.model';

export class TransactionQueryFiltersDto {
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

  @IsUUID()
  @IsOptional()
  cardId?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  minAmount?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  maxAmount?: number;
}
