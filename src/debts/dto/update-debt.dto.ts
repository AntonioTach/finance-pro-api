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

export class UpdateDebtDto {
  @IsEnum(DebtDirection)
  @IsOptional()
  direction?: DebtDirection;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  counterparty?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  totalAmount?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  installments?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  interestRate?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

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
