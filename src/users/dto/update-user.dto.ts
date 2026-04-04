import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  @IsIn(['dark', 'light', 'sand', 'midnight', 'ocean', 'aurora', 'pink-light', 'violet', 'ice', 'graphite'])
  theme?: string;

  @IsString()
  @IsOptional()
  @IsIn(['es', 'en'])
  language?: string;
}

