'use strict';

const { DataTypes } = require('sequelize');

/**
 * Accounts (cash, bank, digital wallets) + transfers between them.
 *
 * Money-movement rule: a transaction moves money in/out of an account iff it
 * has `account_id`. Backfill puts every existing cash-style movement into a
 * per-user "General" default account, and links debit cards (and their
 * purchases) to it so debit spending finally reduces available cash.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('accounts', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: DataTypes.STRING, allowNull: false },
      type: {
        type: DataTypes.ENUM('cash', 'bank', 'digital_wallet', 'other'),
        allowNull: false,
        defaultValue: 'cash',
      },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'MXN' },
      initial_balance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('accounts', ['user_id']);

    await queryInterface.createTable('account_transfers', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      from_account_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'accounts', key: 'id' },
        onDelete: 'CASCADE',
      },
      to_account_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'accounts', key: 'id' },
        onDelete: 'CASCADE',
      },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('account_transfers', ['from_account_id']);
    await queryInterface.addIndex('account_transfers', ['to_account_id']);

    await queryInterface.addColumn('transactions', 'account_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'accounts', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('transactions', ['account_id']);

    await queryInterface.addColumn('cards', 'account_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'accounts', key: 'id' },
      onDelete: 'SET NULL',
    });

    // ── Backfill ───────────────────────────────────────────────────────────
    await queryInterface.sequelize.query(`
      INSERT INTO accounts (id, user_id, name, type, currency, initial_balance, is_default, status, created_at, updated_at)
      SELECT gen_random_uuid(), u.id, 'General', 'cash', 'MXN', 0, true, 'active', NOW(), NOW()
      FROM users u
    `);

    await queryInterface.sequelize.query(`
      UPDATE transactions t
      SET account_id = a.id
      FROM accounts a
      WHERE a.user_id = t.user_id AND a.is_default = true
        AND t.type IN ('income', 'expense', 'card_payment')
    `);

    await queryInterface.sequelize.query(`
      UPDATE cards c
      SET account_id = a.id
      FROM accounts a
      WHERE a.user_id = c.user_id AND a.is_default = true AND c.type = 'debit'
    `);

    await queryInterface.sequelize.query(`
      UPDATE transactions t
      SET account_id = c.account_id
      FROM cards c
      WHERE t.card_id = c.id AND c.type = 'debit' AND t.type = 'card_purchase'
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('cards', 'account_id');
    await queryInterface.removeColumn('transactions', 'account_id');
    await queryInterface.dropTable('account_transfers');
    await queryInterface.dropTable('accounts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_accounts_type"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_accounts_status"');
  },
};
