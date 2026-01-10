import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Sequelize } from 'sequelize-typescript';
import * as bcrypt from 'bcrypt';
import { User } from './models/user.model';
import { Category } from '../categories/models/category.model';
import { CategoryType } from '../categories/models/category.model';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_PROVIDER)
    private readonly sequelize: Sequelize,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const transaction = await this.sequelize.transaction();

    try {
      const existingUser = await User.findOne({
        where: { email: createUserDto.email },
        transaction,
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      const user = await User.create(
        {
          ...createUserDto,
          password: hashedPassword,
          currency: createUserDto.currency || 'USD',
        },
        { transaction },
      );

      await this.createDefaultCategories(user.id, transaction);

      await transaction.commit();
      return user;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async findOne(id: string): Promise<User> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return User.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    await user.update(updateUserDto);
    return user;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  private async createDefaultCategories(
    userId: string,
    transaction: any,
  ): Promise<void> {
    const defaultCategories = [
      { name: 'Alimentación', type: CategoryType.EXPENSE, color: '#FF6B6B', icon: '🍔' },
      { name: 'Transporte', type: CategoryType.EXPENSE, color: '#4ECDC4', icon: '🚗' },
      { name: 'Servicios', type: CategoryType.EXPENSE, color: '#45B7D1', icon: '💡' },
      { name: 'Entretenimiento', type: CategoryType.EXPENSE, color: '#96CEB4', icon: '🎮' },
      { name: 'Salud', type: CategoryType.EXPENSE, color: '#FFEAA7', icon: '⚕️' },
      { name: 'Educación', type: CategoryType.EXPENSE, color: '#DFE6E9', icon: '📚' },
      { name: 'Ropa', type: CategoryType.EXPENSE, color: '#A29BFE', icon: '👔' },
      { name: 'Otros', type: CategoryType.EXPENSE, color: '#B2BEC3', icon: '📦' },
      { name: 'Salario', type: CategoryType.INCOME, color: '#00B894', icon: '💼' },
      { name: 'Freelance', type: CategoryType.INCOME, color: '#6C5CE7', icon: '💻' },
      { name: 'Inversiones', type: CategoryType.INCOME, color: '#FDCB6E', icon: '📈' },
      { name: 'Otros', type: CategoryType.INCOME, color: '#74B9FF', icon: '💰' },
    ];

    await Category.bulkCreate(
      defaultCategories.map((cat) => ({
        ...cat,
        userId,
        isDefault: true,
      })),
      { transaction },
    );
  }
}

