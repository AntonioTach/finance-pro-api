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
    // ── GASTOS ──────────────────────────────────────────────────────────────
    { name: 'Supermercado',            type: CategoryType.EXPENSE, color: '#FF6B6B', icon: '🛒', group: 'Alimentación' },
    { name: 'Restaurantes',            type: CategoryType.EXPENSE, color: '#E84393', icon: '🍽️', group: 'Alimentación' },
    { name: 'Cafeterías',              type: CategoryType.EXPENSE, color: '#A0522D', icon: '☕', group: 'Alimentación' },
    { name: 'Comida Rápida',           type: CategoryType.EXPENSE, color: '#FF4500', icon: '🍔', group: 'Alimentación' },
    { name: 'Bares y Antros',          type: CategoryType.EXPENSE, color: '#8B0000', icon: '🍺', group: 'Alimentación' },
    { name: 'Despensa',                type: CategoryType.EXPENSE, color: '#FF8C69', icon: '🥦', group: 'Alimentación' },
    { name: 'Gasolina',                type: CategoryType.EXPENSE, color: '#4ECDC4', icon: '⛽', group: 'Transporte' },
    { name: 'Transporte Público',      type: CategoryType.EXPENSE, color: '#20B2AA', icon: '🚌', group: 'Transporte' },
    { name: 'Uber / Taxi',             type: CategoryType.EXPENSE, color: '#00CED1', icon: '🚕', group: 'Transporte' },
    { name: 'Estacionamiento',         type: CategoryType.EXPENSE, color: '#5F9EA0', icon: '🅿️', group: 'Transporte' },
    { name: 'Mantenimiento Auto',      type: CategoryType.EXPENSE, color: '#2E8B57', icon: '🔧', group: 'Transporte' },
    { name: 'Viajes',                  type: CategoryType.EXPENSE, color: '#00CEC9', icon: '✈️', group: 'Transporte' },
    { name: 'Renta / Hipoteca',        type: CategoryType.EXPENSE, color: '#E17055', icon: '🏠', group: 'Hogar' },
    { name: 'Luz',                     type: CategoryType.EXPENSE, color: '#FFD700', icon: '💡', group: 'Hogar' },
    { name: 'Agua',                    type: CategoryType.EXPENSE, color: '#1E90FF', icon: '💧', group: 'Hogar' },
    { name: 'Gas',                     type: CategoryType.EXPENSE, color: '#FF6347', icon: '🔥', group: 'Hogar' },
    { name: 'Internet / Telefonía',    type: CategoryType.EXPENSE, color: '#45B7D1', icon: '📡', group: 'Hogar' },
    { name: 'Limpieza del Hogar',      type: CategoryType.EXPENSE, color: '#98FB98', icon: '🧹', group: 'Hogar' },
    { name: 'Muebles y Decoración',    type: CategoryType.EXPENSE, color: '#DEB887', icon: '🛋️', group: 'Hogar' },
    { name: 'Mantenimiento Hogar',     type: CategoryType.EXPENSE, color: '#CD853F', icon: '🪛', group: 'Hogar' },
    { name: 'Médico / Consultas',      type: CategoryType.EXPENSE, color: '#FFEAA7', icon: '🩺', group: 'Salud' },
    { name: 'Farmacia',                type: CategoryType.EXPENSE, color: '#90EE90', icon: '💊', group: 'Salud' },
    { name: 'Dental',                  type: CategoryType.EXPENSE, color: '#E0FFFF', icon: '🦷', group: 'Salud' },
    { name: 'Salud Mental',            type: CategoryType.EXPENSE, color: '#DDA0DD', icon: '🧠', group: 'Salud' },
    { name: 'Gimnasio',                type: CategoryType.EXPENSE, color: '#00B894', icon: '💪', group: 'Salud' },
    { name: 'Deportes',                type: CategoryType.EXPENSE, color: '#32CD32', icon: '⚽', group: 'Salud' },
    { name: 'Educación',               type: CategoryType.EXPENSE, color: '#DFE6E9', icon: '📚', group: 'Educación' },
    { name: 'Cursos y Capacitación',   type: CategoryType.EXPENSE, color: '#87CEEB', icon: '🎓', group: 'Educación' },
    { name: 'Libros',                  type: CategoryType.EXPENSE, color: '#F4A460', icon: '📖', group: 'Educación' },
    { name: 'Suscripciones Digitales', type: CategoryType.EXPENSE, color: '#6C5CE7', icon: '📺', group: 'Entretenimiento' },
    { name: 'Cine y Teatro',           type: CategoryType.EXPENSE, color: '#9400D3', icon: '🎬', group: 'Entretenimiento' },
    { name: 'Videojuegos',             type: CategoryType.EXPENSE, color: '#7B68EE', icon: '🎮', group: 'Entretenimiento' },
    { name: 'Música',                  type: CategoryType.EXPENSE, color: '#FF69B4', icon: '🎵', group: 'Entretenimiento' },
    { name: 'Salidas y Eventos',       type: CategoryType.EXPENSE, color: '#FF7F50', icon: '🎉', group: 'Entretenimiento' },
    { name: 'Hobbies',                 type: CategoryType.EXPENSE, color: '#96CEB4', icon: '🎨', group: 'Entretenimiento' },
    { name: 'Ropa y Calzado',          type: CategoryType.EXPENSE, color: '#A29BFE', icon: '👔', group: 'Personal' },
    { name: 'Belleza y Cuidado Personal', type: CategoryType.EXPENSE, color: '#FF85A1', icon: '💅', group: 'Personal' },
    { name: 'Mascotas',                type: CategoryType.EXPENSE, color: '#FDCB6E', icon: '🐾', group: 'Personal' },
    { name: 'Niños y Bebés',           type: CategoryType.EXPENSE, color: '#FFB6C1', icon: '👶', group: 'Personal' },
    { name: 'Regalos',                 type: CategoryType.EXPENSE, color: '#FD79A8', icon: '🎁', group: 'Personal' },
    { name: 'Seguros',                 type: CategoryType.EXPENSE, color: '#636E72', icon: '🛡️', group: 'Finanzas' },
    { name: 'Impuestos',               type: CategoryType.EXPENSE, color: '#708090', icon: '📋', group: 'Finanzas' },
    { name: 'Pagos de Tarjeta',        type: CategoryType.EXPENSE, color: '#3B82F6', icon: '💳', group: 'Finanzas' },
    { name: 'Préstamos',               type: CategoryType.EXPENSE, color: '#DC143C', icon: '💸', group: 'Finanzas' },
    { name: 'Ahorro Programado',       type: CategoryType.EXPENSE, color: '#3CB371', icon: '🏦', group: 'Finanzas' },
    { name: 'Donaciones',              type: CategoryType.EXPENSE, color: '#FF6666', icon: '❤️', group: 'Finanzas' },
    { name: 'Tecnología y Gadgets',    type: CategoryType.EXPENSE, color: '#0984E3', icon: '📱', group: 'Tecnología' },
    { name: 'Otros Gastos',            type: CategoryType.EXPENSE, color: '#B2BEC3', icon: '📦', group: 'Otros' },

    // ── INGRESOS ─────────────────────────────────────────────────────────────
    { name: 'Salario',                 type: CategoryType.INCOME, color: '#00B894', icon: '💼', group: 'Trabajo' },
    { name: 'Nómina Extra',            type: CategoryType.INCOME, color: '#00A381', icon: '🏢', group: 'Trabajo' },
    { name: 'Freelance',               type: CategoryType.INCOME, color: '#6C5CE7', icon: '💻', group: 'Trabajo' },
    { name: 'Honorarios',              type: CategoryType.INCOME, color: '#5A4FCF', icon: '📝', group: 'Trabajo' },
    { name: 'Comisiones',              type: CategoryType.INCOME, color: '#00CEC9', icon: '🤝', group: 'Trabajo' },
    { name: 'Propinas',                type: CategoryType.INCOME, color: '#55EFC4', icon: '💵', group: 'Trabajo' },
    { name: 'Bonos',                   type: CategoryType.INCOME, color: '#FDCB6E', icon: '🎯', group: 'Trabajo' },
    { name: 'Horas Extra',             type: CategoryType.INCOME, color: '#F0A500', icon: '⏰', group: 'Trabajo' },
    { name: 'Inversiones',             type: CategoryType.INCOME, color: '#F9CA24', icon: '📈', group: 'Inversiones' },
    { name: 'Dividendos',              type: CategoryType.INCOME, color: '#F0932B', icon: '📊', group: 'Inversiones' },
    { name: 'Intereses Bancarios',     type: CategoryType.INCOME, color: '#6AB04C', icon: '🏛️', group: 'Inversiones' },
    { name: 'Criptomonedas',           type: CategoryType.INCOME, color: '#F7931A', icon: '₿', group: 'Inversiones' },
    { name: 'Venta de Activos',        type: CategoryType.INCOME, color: '#E17055', icon: '🏗️', group: 'Inversiones' },
    { name: 'Renta de Propiedad',      type: CategoryType.INCOME, color: '#A29BFE', icon: '🏘️', group: 'Rentas' },
    { name: 'Airbnb / Renta Temporal', type: CategoryType.INCOME, color: '#FF5A5F', icon: '🏡', group: 'Rentas' },
    { name: 'Ventas en Línea',         type: CategoryType.INCOME, color: '#F368E0', icon: '🛍️', group: 'Ventas' },
    { name: 'Ventas de Artículos',     type: CategoryType.INCOME, color: '#FF9F43', icon: '🏷️', group: 'Ventas' },
    { name: 'Reembolsos',              type: CategoryType.INCOME, color: '#55EFC4', icon: '↩️', group: 'Otros' },
    { name: 'Becas',                   type: CategoryType.INCOME, color: '#74B9FF', icon: '🎓', group: 'Otros' },
    { name: 'Pensión',                 type: CategoryType.INCOME, color: '#81ECEC', icon: '👴', group: 'Otros' },
    { name: 'Regalos Recibidos',       type: CategoryType.INCOME, color: '#FD79A8', icon: '🎀', group: 'Otros' },
    { name: 'Premio / Lotería',        type: CategoryType.INCOME, color: '#FFDD59', icon: '🎲', group: 'Otros' },
    { name: 'Préstamo Recibido',       type: CategoryType.INCOME, color: '#B8C1CC', icon: '🤲', group: 'Otros' },
    { name: 'Otros Ingresos',          type: CategoryType.INCOME, color: '#DFE6E9', icon: '💰', group: 'Otros' },
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
    });

    const existingMap = new Map(
      existingCategories.map((cat) => [`${cat.name}-${cat.type}`, cat]),
    );

    const missingCategories = this.defaultCategories.filter(
      (cat) => !existingMap.has(`${cat.name}-${cat.type}`),
    );

    if (missingCategories.length > 0) {
      await Category.bulkCreate(
        missingCategories.map((cat) => ({ ...cat, userId, isDefault: true })),
      );
    }

    // Patch group on existing default categories that are missing it
    const updatePromises: Promise<unknown>[] = [];
    for (const def of this.defaultCategories) {
      const existing = existingMap.get(`${def.name}-${def.type}`);
      if (existing && existing.group !== def.group) {
        updatePromises.push(existing.update({ group: def.group }));
      }
    }
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    return {
      added: missingCategories.length,
      total: this.defaultCategories.length,
    };
  }
}

