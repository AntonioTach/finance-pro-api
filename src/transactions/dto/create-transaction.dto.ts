import {
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
  IsIn,
  MaxLength,
  Min,
} from 'class-validator';
import { TransactionType } from '../models/transaction.model';

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  amount: number;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @IsUUID()
  @IsOptional()
  cardId?: string;

  @IsOptional()
  @IsIn([3, 6, 9, 12, 15, 18, 24])
  installmentMonths?: number;
}

