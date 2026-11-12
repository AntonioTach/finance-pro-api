import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { AccountType } from '../models/account.model';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsNumber()
  initialBalance?: number;

  /** Only `true` is meaningful: makes this the default and unsets the previous one. */
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
