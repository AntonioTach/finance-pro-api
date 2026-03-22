'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    // ── 1. Extend budgets table ──────────────────────────────────
    await queryInterface.addColumn('budgets', 'name', {
      type: DataTypes.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn('budgets', 'is_active', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addColumn('budgets', 'alert_threshold', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 80,
    });

    await queryInterface.addColumn('budgets', 'notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('budgets', 'rollover_enabled', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('budgets', 'rollover_amount', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn('budgets', 'auto_renew', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addColumn('budgets', 'amount_type', {
      type: DataTypes.ENUM('fixed', 'percent'),
      allowNull: false,
      defaultValue: 'fixed',
    });

    await queryInterface.addColumn('budgets', 'amount_percent', {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null,
    });

    // Add biweekly and custom to the period enum
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_budgets_period" ADD VALUE IF NOT EXISTS 'biweekly'`,
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_budgets_period" ADD VALUE IF NOT EXISTS 'custom'`,
    );

    // ── 2. Create budget_alerts table ────────────────────────────
    await queryInterface.createTable('budget_alerts', {
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
      type: {
        type: DataTypes.ENUM(
          'threshold_50',
          'threshold_80',
          'threshold_100',
          'exceeded',
          'burn_rate',
          'renewal',
        ),
        allowNull: false,
      },
      triggered_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      period_key: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'e.g. "2026-03" for monthly, "2026-W12" for weekly — used to deduplicate alerts per period',
      },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('budget_alerts', ['budget_id']);
    await queryInterface.addIndex('budget_alerts', ['user_id', 'is_read']);
    await queryInterface.addIndex('budget_alerts', ['budget_id', 'type', 'period_key'], {
      name: 'uq_budget_alert_per_period',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('budget_alerts');

    await queryInterface.removeColumn('budgets', 'name');
    await queryInterface.removeColumn('budgets', 'is_active');
    await queryInterface.removeColumn('budgets', 'alert_threshold');
    await queryInterface.removeColumn('budgets', 'notes');
    await queryInterface.removeColumn('budgets', 'rollover_enabled');
    await queryInterface.removeColumn('budgets', 'rollover_amount');
    await queryInterface.removeColumn('budgets', 'auto_renew');
    await queryInterface.removeColumn('budgets', 'amount_type');
    await queryInterface.removeColumn('budgets', 'amount_percent');

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_budget_alerts_type"',
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_budgets_amount_type"',
    );
  },
};
