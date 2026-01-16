import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Sequelize } from 'sequelize-typescript';
import { Category, CategoryType } from './models/category.model';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  private readonly defaultCategories = [
    // Expense categories
    { name: 'Alimentación', type: CategoryType.EXPENSE, color: '#FF6B6B', icon: '🍔' },
    { name: 'Transporte', type: CategoryType.EXPENSE, color: '#4ECDC4', icon: '🚗' },
    { name: 'Servicios', type: CategoryType.EXPENSE, color: '#45B7D1', icon: '💡' },
    { name: 'Entretenimiento', type: CategoryType.EXPENSE, color: '#96CEB4', icon: '🎮' },
    { name: 'Salud', type: CategoryType.EXPENSE, color: '#FFEAA7', icon: '⚕️' },
    { name: 'Educación', type: CategoryType.EXPENSE, color: '#DFE6E9', icon: '📚' },
    { name: 'Ropa', type: CategoryType.EXPENSE, color: '#A29BFE', icon: '👔' },
    { name: 'Hogar', type: CategoryType.EXPENSE, color: '#E17055', icon: '🏠' },
    { name: 'Mascotas', type: CategoryType.EXPENSE, color: '#FDCB6E', icon: '🐾' },
    { name: 'Viajes', type: CategoryType.EXPENSE, color: '#00CEC9', icon: '✈️' },
    { name: 'Suscripciones', type: CategoryType.EXPENSE, color: '#6C5CE7', icon: '📺' },
    { name: 'Restaurantes', type: CategoryType.EXPENSE, color: '#E84393', icon: '🍽️' },
    { name: 'Gimnasio', type: CategoryType.EXPENSE, color: '#00B894', icon: '💪' },
    { name: 'Tecnología', type: CategoryType.EXPENSE, color: '#0984E3', icon: '📱' },
    { name: 'Regalos', type: CategoryType.EXPENSE, color: '#FD79A8', icon: '🎁' },
    { name: 'Seguros', type: CategoryType.EXPENSE, color: '#636E72', icon: '🛡️' },
    { name: 'Pagos de Tarjeta', type: CategoryType.EXPENSE, color: '#3B82F6', icon: '💳' },
    { name: 'Otros Gastos', type: CategoryType.EXPENSE, color: '#B2BEC3', icon: '📦' },
    // Income categories
    { name: 'Salario', type: CategoryType.INCOME, color: '#00B894', icon: '💼' },
    { name: 'Trabajo', type: CategoryType.INCOME, color: '#0984E3', icon: '🏢' },
    { name: 'Freelance', type: CategoryType.INCOME, color: '#6C5CE7', icon: '💻' },
    { name: 'Inversiones', type: CategoryType.INCOME, color: '#FDCB6E', icon: '📈' },
    { name: 'Bonos', type: CategoryType.INCOME, color: '#00CEC9', icon: '🎯' },
    { name: 'Ventas', type: CategoryType.INCOME, color: '#E17055', icon: '🛒' },
    { name: 'Alquiler', type: CategoryType.INCOME, color: '#A29BFE', icon: '🏘️' },
    { name: 'Reembolsos', type: CategoryType.INCOME, color: '#55EFC4', icon: '↩️' },
    { name: 'Regalos Recibidos', type: CategoryType.INCOME, color: '#FD79A8', icon: '🎀' },
    { name: 'Otros Ingresos', type: CategoryType.INCOME, color: '#74B9FF', icon: '💰' },
  ];

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

  /**
   * Syncs default categories for an existing user
   * Adds any missing default categories without duplicating existing ones
   */
  async syncDefaultCategories(userId: string): Promise<{ added: number; total: number }> {
    const existingCategories = await Category.findAll({
      where: { userId },
      attributes: ['name', 'type'],
    });

    const existingSet = new Set(
      existingCategories.map((cat) => `${cat.name}-${cat.type}`),
    );

    const missingCategories = this.defaultCategories.filter(
      (cat) => !existingSet.has(`${cat.name}-${cat.type}`),
    );

    if (missingCategories.length > 0) {
      await Category.bulkCreate(
        missingCategories.map((cat) => ({
          ...cat,
          userId,
          isDefault: true,
        })),
      );
    }

    return {
      added: missingCategories.length,
      total: this.defaultCategories.length,
    };
  }
}

