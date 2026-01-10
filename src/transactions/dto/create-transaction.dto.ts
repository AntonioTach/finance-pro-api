import {
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
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
  description: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

