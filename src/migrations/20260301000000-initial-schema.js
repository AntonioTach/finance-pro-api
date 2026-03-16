'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('users', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      name: { type: DataTypes.STRING, allowNull: false },
      password: { type: DataTypes.STRING, allowNull: false },
      currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable('categories', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: DataTypes.STRING, allowNull: false },
      type: { type: DataTypes.ENUM('income', 'expense'), allowNull: false },
      color: { type: DataTypes.STRING, allowNull: false },
      icon: { type: DataTypes.STRING, allowNull: false },
      is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable('cards', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: DataTypes.STRING, allowNull: false },
      type: { type: DataTypes.ENUM('credit', 'debit'), allowNull: false },
      network: { type: DataTypes.ENUM('visa', 'mastercard', 'amex', 'other'), allowNull: true },
      last4: { type: DataTypes.STRING(4), allowNull: true },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'MXN' },
      credit_limit: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      billing_cutoff_day: { type: DataTypes.INTEGER, allowNull: true },
      payment_due_type: { type: DataTypes.ENUM('fixed_day', 'days_after'), allowNull: true },
      payment_due_value: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable('transactions', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      type: {
        type: DataTypes.ENUM('income', 'expense', 'card_purchase', 'card_payment'),
        allowNull: false,
      },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'categories', key: 'id' },
      },
      description: { type: DataTypes.STRING, allowNull: false },
      date: { type: DataTypes.DATE, allowNull: false },
      notes: { type: DataTypes.TEXT, allowNull: true },
      card_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'cards', key: 'id' },
        onDelete: 'SET NULL',
      },
      installment_months: { type: DataTypes.INTEGER, allowNull: true },
      installment_current: { type: DataTypes.INTEGER, allowNull: true },
      parent_transaction_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'transactions', key: 'id' },
        onDelete: 'SET NULL',
      },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('transactions', ['parent_transaction_id']);
    await queryInterface.addIndex('transactions', ['installment_months']);

    await queryInterface.createTable('budgets', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'categories', key: 'id' },
      },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      period: { type: DataTypes.ENUM('weekly', 'monthly', 'yearly'), allowNull: false },
      start_date: { type: DataTypes.DATE, allowNull: false },
      end_date: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable('subscriptions', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: DataTypes.STRING, allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      payment_day: { type: DataTypes.INTEGER, allowNull: false },
      category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'categories', key: 'id' },
      },
      card_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'cards', key: 'id' },
        onDelete: 'SET NULL',
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('subscriptions');
    await queryInterface.dropTable('budgets');
    await queryInterface.dropTable('transactions');
    await queryInterface.dropTable('cards');
    await queryInterface.dropTable('categories');
    await queryInterface.dropTable('users');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_transactions_type"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_categories_type"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_cards_type"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_cards_network"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_cards_payment_due_type"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_cards_status"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_budgets_period"');
  },
};
