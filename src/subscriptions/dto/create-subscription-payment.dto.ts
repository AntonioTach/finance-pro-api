import {
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateSubscriptionPaymentDto {
  @IsDateString()
  paymentDate: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsBoolean()
  @IsOptional()
  createTransaction?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
