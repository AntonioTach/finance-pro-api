import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  IsInt,
} from 'class-validator';
import { DebtDirection, DebtStatus } from '../models/debt.model';

export class CreateDebtDto {
  @IsEnum(DebtDirection)
  direction: DebtDirection;

  @IsString()
  @IsNotEmpty()
  counterparty: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0.01)
  totalAmount: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  installments?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  interestRate?: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(DebtStatus)
  @IsOptional()
  status?: DebtStatus;
}
