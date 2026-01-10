import {
  IsNotEmpty,
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { CategoryType } from '../models/category.model';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(CategoryType)
  @IsNotEmpty()
  type: CategoryType;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsString()
  @IsNotEmpty()
  icon: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

