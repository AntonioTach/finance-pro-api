'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('subscription_payments', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      subscription_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'subscriptions', key: 'id' },
        onDelete: 'CASCADE',
      },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      payment_date: { type: DataTypes.DATEONLY, allowNull: false },
      period_year: { type: DataTypes.INTEGER, allowNull: false },
      period_month: { type: DataTypes.INTEGER, allowNull: false },
      is_automatic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      notes: { type: DataTypes.TEXT, allowNull: true },
      transaction_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'transactions', key: 'id' },
        onDelete: 'SET NULL',
      },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex(
      'subscription_payments',
      ['subscription_id', 'period_year', 'period_month'],
      { unique: true, name: 'subscription_payments_subscription_period_unique' },
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('subscription_payments');
  },
};
