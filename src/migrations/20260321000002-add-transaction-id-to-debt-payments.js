'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn('debt_payments', 'transaction_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'transactions', key: 'id' },
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('debt_payments', 'transaction_id');
  },
};
