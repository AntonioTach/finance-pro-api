import { IsDateString, IsOptional } from 'class-validator';

export class BalancesQueryDto {
  @IsOptional()
  @IsDateString()
  asOf?: string;
}
