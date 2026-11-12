'use strict';

const { DataTypes } = require('sequelize');

/**
 * Reconciliations (balance reconciliations). A reconciliation is a session on a given date in
 * which the user records the REAL balance of some accounts and/or the REAL
 * current debt of some credit cards. Each reconciliation_item becomes the balance
 * anchor for its target: balance = real_amount + movements dated after it.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('reconciliations', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('reconciliations', ['user_id', 'date']);

    await queryInterface.createTable('reconciliation_items', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      reconciliation_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'reconciliations', key: 'id' },
        onDelete: 'CASCADE',
      },
      target_type: { type: DataTypes.ENUM('account', 'card'), allowNull: false },
      account_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'accounts', key: 'id' },
        onDelete: 'CASCADE',
      },
      card_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'cards', key: 'id' },
        onDelete: 'CASCADE',
      },
      computed_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      real_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      difference: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('reconciliation_items', ['reconciliation_id']);
    await queryInterface.addIndex('reconciliation_items', ['account_id']);
    await queryInterface.addIndex('reconciliation_items', ['card_id']);

    await queryInterface.sequelize.query(`
      ALTER TABLE reconciliation_items ADD CONSTRAINT reconciliation_items_single_target CHECK (
        (target_type = 'account' AND account_id IS NOT NULL AND card_id IS NULL) OR
        (target_type = 'card' AND card_id IS NOT NULL AND account_id IS NULL)
      )
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('reconciliation_items');
    await queryInterface.dropTable('reconciliations');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_reconciliation_items_target_type"');
  },
};
