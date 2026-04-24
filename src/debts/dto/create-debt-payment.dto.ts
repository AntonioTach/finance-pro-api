import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  IsUUID,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateDebtPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  @IsNotEmpty()
  paymentDate: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsBoolean()
  @IsOptional()
  createTransaction?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  installmentNumber?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
