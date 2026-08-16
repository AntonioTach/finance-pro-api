import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Sequelize } from 'sequelize-typescript';
import * as bcrypt from 'bcrypt';
import { User } from './models/user.model';
import { Category } from '../categories/models/category.model';
import { DEFAULT_CATEGORIES } from '../categories/constants/default-categories.const';
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

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existing = await User.findOne({ where: { email: updateUserDto.email } });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

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
    await Category.bulkCreate(
      DEFAULT_CATEGORIES.map((cat) => ({
        ...cat,
        userId,
        isDefault: true,
      })),
      { transaction },
    );
  }
}

