import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { BudgetPeriod, BudgetAmountType } from '../models/budget.model';

export class UpdateBudgetDto {
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  amount?: number;

  @IsEnum(BudgetAmountType)
  @IsOptional()
  amountType?: BudgetAmountType;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  amountPercent?: number;

  @IsEnum(BudgetPeriod)
  @IsOptional()
  period?: BudgetPeriod;

  @IsDateString()
  @IsOptional()
  startDate?: string;

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

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
