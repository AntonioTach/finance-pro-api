'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('debts', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      direction: {
        type: DataTypes.ENUM('owed_by_me', 'owed_to_me'),
        allowNull: false,
      },
      counterparty: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.STRING, allowNull: false },
      total_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      installments: { type: DataTypes.INTEGER, allowNull: true },
      interest_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      due_date: { type: DataTypes.DATEONLY, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM('active', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'active',
      },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable('debt_payments', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      debt_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'debts', key: 'id' },
        onDelete: 'CASCADE',
      },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      payment_date: { type: DataTypes.DATEONLY, allowNull: false },
      installment_number: { type: DataTypes.INTEGER, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('debt_payments', ['debt_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('debt_payments');
    await queryInterface.dropTable('debts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_debts_direction"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_debts_status"');
  },
};
