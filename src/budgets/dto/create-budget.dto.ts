import {
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsUUID,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { BudgetPeriod, BudgetAmountType } from '../models/budget.model';

export class CreateBudgetDto {
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  amount: number;

  @IsEnum(BudgetAmountType)
  @IsOptional()
  amountType?: BudgetAmountType;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  amountPercent?: number;

  @IsEnum(BudgetPeriod)
  @IsNotEmpty()
  period: BudgetPeriod;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  alertThreshold?: number;

  @IsBoolean()
  @IsOptional()
  rolloverEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
