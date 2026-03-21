import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  IsUUID,
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
  @IsNotEmpty()
  categoryId: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  installmentNumber?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
