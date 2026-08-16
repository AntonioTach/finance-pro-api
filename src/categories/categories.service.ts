import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Sequelize } from 'sequelize-typescript';
import { Category } from './models/category.model';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(DATABASE_PROVIDER)
    private readonly sequelize: Sequelize,
  ) {}

  async create(
    userId: string,
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    return Category.create({
      ...createCategoryDto,
      userId,
    });
  }

  async findAll(userId: string): Promise<Category[]> {
    return Category.findAll({
      where: { userId },
      order: [['name', 'ASC']],
    });
  }

  async findOne(id: string, userId: string): Promise<Category> {
    const category = await Category.findOne({
      where: { id, userId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(
    id: string,
    userId: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id, userId);
    await category.update(updateCategoryDto);
    return category;
  }

  async remove(id: string, userId: string): Promise<void> {
    const category = await this.findOne(id, userId);
    
    if (category.isDefault) {
      throw new ForbiddenException('Cannot delete default category');
    }

    await category.destroy();
  }
}

