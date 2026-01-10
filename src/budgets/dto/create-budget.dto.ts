import {
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsUUID,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';
import { BudgetPeriod } from '../models/budget.model';

export class CreateBudgetDto {
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  amount: number;

  @IsEnum(BudgetPeriod)
  @IsNotEmpty()
  period: BudgetPeriod;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

