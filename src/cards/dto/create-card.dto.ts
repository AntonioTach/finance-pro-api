import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  Max,
  Length,
  ValidateIf,
} from 'class-validator';
import { CardType, CardNetwork, PaymentDueType } from '../models/card.model';

export class CreateCardDto {
  @IsString()
  name: string;

  @IsEnum(CardType)
  type: CardType;

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

  @ValidateIf((o) => o.type === CardType.CREDIT)
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ValidateIf((o) => o.type === CardType.CREDIT)
  @IsInt()
  @Min(1)
  @Max(31)
  billingCutoffDay?: number;

  @ValidateIf((o) => o.type === CardType.CREDIT)
  @IsEnum(PaymentDueType)
  paymentDueType?: PaymentDueType;

  @ValidateIf((o) => o.type === CardType.CREDIT)
  @IsInt()
  @Min(1)
  @Max(31)
  paymentDueValue?: number;
}
