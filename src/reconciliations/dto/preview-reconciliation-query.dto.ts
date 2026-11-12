import { IsDateString, IsOptional } from 'class-validator';

export class PreviewReconciliationQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
