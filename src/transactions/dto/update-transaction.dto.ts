import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  IsDateString,
  IsIn,
  Min,
} from 'class-validator';
import { TransactionType } from '../models/transaction.model';

export class UpdateTransactionDto {
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  amount?: number;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  cardId?: string;

  @IsOptional()
  @IsIn([3, 6, 9, 12, 15, 18, 24])
  installmentMonths?: number;
}

