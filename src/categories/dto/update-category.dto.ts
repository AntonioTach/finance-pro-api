import {
  IsOptional,
  IsEnum,
  IsString,
  IsBoolean,
} from 'class-validator';
import { CategoryType } from '../models/category.model';

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

