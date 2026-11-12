import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Transaction as SequelizeTransaction } from 'sequelize';
import { Account, AccountStatus, AccountType } from './models/account.model';
import { Card, CardType } from '../cards/models/card.model';

// Kept as string literals (not TransactionType) to avoid a circular import
// with transaction.model.ts, which calls into this file from a hook.
const CARD_PURCHASE = 'card_purchase';

/**
 * Returns the user's default account, creating one if it does not exist yet
 * (e.g. users created before the accounts feature whose migration was
 * skipped, or a default that was deleted directly in the DB).
 */
export async function getOrCreateDefaultAccount(
  userId: string,
  transaction?: SequelizeTransaction,
): Promise<Account> {
  const existing = await Account.findOne({
    where: { userId, isDefault: true },
    transaction,
  });
  if (existing) return existing;

  return Account.create(
    { userId, name: 'Efectivo', type: AccountType.CASH, isDefault: true },
    { transaction },
  );
}

/**
 * Money-movement rule. A transaction belongs to an account iff it moves real
 * money:
 * - card_purchase on a DEBIT card  → the card's account (client value ignored)
 * - card_purchase on a CREDIT card → null (only increases card debt)
 * - income / expense / card_payment → the given account, or the user's default
 */
export async function resolveTransactionAccountId(
  input: {
    userId: string;
    type: string;
    cardId?: string | null;
    accountId?: string | null;
  },
  transaction?: SequelizeTransaction,
): Promise<string | null> {
  if (input.type === CARD_PURCHASE) {
    if (!input.cardId) return null;
    const card = await Card.findByPk(input.cardId, { transaction });
    if (!card || card.type !== CardType.DEBIT) return null;
    return card.accountId ?? (await getOrCreateDefaultAccount(input.userId, transaction)).id;
  }

  if (input.accountId) {
    const account = await Account.findByPk(input.accountId, { transaction });
    if (!account || account.userId !== input.userId) {
      throw new NotFoundException('Account not found');
    }
    if (account.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException('Account is inactive');
    }
    return account.id;
  }

  return (await getOrCreateDefaultAccount(input.userId, transaction)).id;
}
