import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateMsiGroupDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
