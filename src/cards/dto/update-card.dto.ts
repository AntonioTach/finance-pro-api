import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  Max,
  Length,
} from 'class-validator';
import { CardType, CardNetwork, CardStatus, PaymentDueType } from '../models/card.model';

export class UpdateCardDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(CardType)
  type?: CardType;

  @IsOptional()
  @IsEnum(CardNetwork)
  network?: CardNetwork;

  @IsOptional()
  @IsString()
  @Length(4, 4)
  last4?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  billingCutoffDay?: number;

  @IsOptional()
  @IsEnum(PaymentDueType)
  paymentDueType?: PaymentDueType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  paymentDueValue?: number;

  @IsOptional()
  @IsEnum(CardStatus)
  status?: CardStatus;
}
