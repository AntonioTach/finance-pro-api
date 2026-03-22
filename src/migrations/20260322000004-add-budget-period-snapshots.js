'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('budget_period_snapshots', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      budget_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'budgets', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      period_start:     { type: DataTypes.DATEONLY, allowNull: false },
      period_end:       { type: DataTypes.DATEONLY, allowNull: false },
      budgeted_amount:  { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      spent_amount:     { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      rollover_in:      { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      rollover_out:     { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      closed_at:        { type: DataTypes.DATE, allowNull: false },
      created_at:       { type: DataTypes.DATE, allowNull: false },
      updated_at:       { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('budget_period_snapshots', ['budget_id']);
    await queryInterface.addIndex('budget_period_snapshots', ['user_id']);
    // Unique: one snapshot per budget per period
    await queryInterface.addIndex(
      'budget_period_snapshots',
      ['budget_id', 'period_start'],
      { name: 'uq_snapshot_budget_period', unique: true },
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('budget_period_snapshots');
  },
};
