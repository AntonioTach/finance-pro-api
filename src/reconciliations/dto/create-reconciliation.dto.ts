import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateReconciliationItemDto {
  /** Exactly one of accountId / cardId must be set (checked in the service). */
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsUUID()
  cardId?: string;

  /** Real money on hand (account) or real current debt (credit card). */
  @IsNumber()
  realAmount: number;
}

export class CreateReconciliationDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateReconciliationItemDto)
  items: CreateReconciliationItemDto[];
}
