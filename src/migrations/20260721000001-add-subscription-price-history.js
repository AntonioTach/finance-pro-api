'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('subscription_price_history', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      subscription_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'subscriptions', key: 'id' },
        onDelete: 'CASCADE',
      },
      previous_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      new_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      changed_at: { type: DataTypes.DATE, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('subscription_price_history', ['subscription_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('subscription_price_history');
  },
};
