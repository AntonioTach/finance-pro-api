import { Provider } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { ConfigService } from '@nestjs/config';
import { Dialect } from 'sequelize';
import { User } from '../users/models/user.model';
import { Transaction } from '../transactions/models/transaction.model';
import { Category } from '../categories/models/category.model';
import { Budget } from '../budgets/models/budget.model';

export const DATABASE_PROVIDER = 'SEQUELIZE';

export const databaseProvider: Provider = {
  provide: DATABASE_PROVIDER,
  useFactory: async (configService: ConfigService) => {
    const sequelize = new Sequelize({
      dialect: 'postgres' as Dialect,
      host: configService.get<string>('DATABASE_HOST', 'localhost'),
      port: configService.get<number>('DATABASE_PORT', 5432),
      username: configService.get<string>('DATABASE_USER', 'postgres'),
      password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
      database: configService.get<string>('DATABASE_NAME', 'financepro'),
      logging: configService.get<string>('NODE_ENV') === 'development' ? console.log : false,
      models: [User, Transaction, Category, Budget],
      define: {
        timestamps: true,
        underscored: true,
      },
    });

    try {
      await sequelize.authenticate();
      console.log('Database connection established successfully.');
      
      if (configService.get<string>('NODE_ENV') === 'development') {
        await sequelize.sync({ alter: true });
        console.log('Database synchronized.');
      }
    } catch (error) {
      console.error('Unable to connect to the database:', error);
    }

    return sequelize;
  },
  inject: [ConfigService],
};

