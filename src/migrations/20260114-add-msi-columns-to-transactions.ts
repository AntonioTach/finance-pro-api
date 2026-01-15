/**
 * Migration: Add MSI (Meses Sin Intereses) columns to transactions table
 * 
 * This migration adds the following columns:
 * - installment_months: Total number of installments (3, 6, 9, 12, 15, 18, 24)
 * - installment_current: Current installment number
 * - parent_transaction_id: Reference to the parent transaction for installments
 * 
 * Run this migration manually if using production mode (development uses sync with alter).
 * 
 * SQL Commands to run:
 */

const migrationSQL = `
-- Add installment_months column
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS installment_months INTEGER;

-- Add installment_current column
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS installment_current INTEGER;

-- Add parent_transaction_id column with foreign key
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS parent_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

-- Create index for parent_transaction_id for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_parent_transaction_id 
ON transactions(parent_transaction_id);

-- Create index for MSI transactions
CREATE INDEX IF NOT EXISTS idx_transactions_installment_months 
ON transactions(installment_months) 
WHERE installment_months IS NOT NULL;
`;

// Rollback SQL
const rollbackSQL = `
-- Remove indexes
DROP INDEX IF EXISTS idx_transactions_installment_months;
DROP INDEX IF EXISTS idx_transactions_parent_transaction_id;

-- Remove columns
ALTER TABLE transactions DROP COLUMN IF EXISTS parent_transaction_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS installment_current;
ALTER TABLE transactions DROP COLUMN IF EXISTS installment_months;
`;

export const up = migrationSQL;
export const down = rollbackSQL;

// Export for programmatic usage
export default {
  up: migrationSQL,
  down: rollbackSQL,
};
