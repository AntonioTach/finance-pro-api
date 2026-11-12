import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Account, AccountStatus } from './models/account.model';
import { AccountTransfer } from './models/account-transfer.model';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { BalanceAnchor, BalanceService } from './balance.service';
import { getOrCreateDefaultAccount } from './account-resolution';
import { todayStr } from '../common/utils/date.util';

export interface AccountWithBalance {
  id: string;
  name: string;
  type: string;
  currency: string;
  initialBalance: number;
  isDefault: boolean;
  status: string;
  balance: number;
  lastReconciliation: BalanceAnchor | null;
}

@Injectable()
export class AccountsService {
  constructor(
    @Inject(DATABASE_PROVIDER)
    private readonly sequelize: Sequelize,
    private readonly balanceService: BalanceService,
  ) {}

  async findAll(userId: string, asOf?: string): Promise<AccountWithBalance[]> {
    // Guarantees every user sees at least their default account.
    await getOrCreateDefaultAccount(userId);
    const accounts = await Account.findAll({
      where: { userId, status: AccountStatus.ACTIVE },
      order: [
        ['isDefault', 'DESC'],
        ['name', 'ASC'],
      ],
    });
    return Promise.all(accounts.map((a) => this.withBalance(a, asOf)));
  }

  async getBalances(
    userId: string,
    asOf?: string,
  ): Promise<{ asOf: string; accounts: AccountWithBalance[]; total: number }> {
    const date = this.normalizeDate(asOf);
    const accounts = await this.findAll(userId, date);
    const total = Math.round(accounts.reduce((s, a) => s + a.balance, 0) * 100) / 100;
    return { asOf: date, accounts, total };
  }

  async findOne(id: string, userId: string): Promise<AccountWithBalance> {
    return this.withBalance(await this.getOwned(id, userId));
  }

  async create(userId: string, dto: CreateAccountDto): Promise<AccountWithBalance> {
    const account = await this.sequelize.transaction(async (t) => {
      const hasDefault = await Account.count({ where: { userId, isDefault: true }, transaction: t });
      const makeDefault = dto.isDefault === true || hasDefault === 0;
      if (makeDefault) {
        await Account.update({ isDefault: false }, { where: { userId }, transaction: t });
      }
      return Account.create({ ...dto, userId, isDefault: makeDefault }, { transaction: t });
    });
    return this.withBalance(account);
  }

  async update(id: string, userId: string, dto: UpdateAccountDto): Promise<AccountWithBalance> {
    const account = await this.getOwned(id, userId);
    await this.sequelize.transaction(async (t) => {
      const { isDefault, ...rest } = dto;
      if (isDefault === true && !account.isDefault) {
        await Account.update({ isDefault: false }, { where: { userId }, transaction: t });
        await account.update({ ...rest, isDefault: true }, { transaction: t });
      } else {
        // Unsetting the default is done by promoting another account.
        await account.update(rest, { transaction: t });
      }
    });
    return this.withBalance(await this.getOwned(id, userId));
  }

  async remove(id: string, userId: string): Promise<void> {
    const account = await this.getOwned(id, userId);
    if (account.isDefault) {
      throw new BadRequestException(
        'Cannot deactivate the default account; make another account the default first',
      );
    }
    await account.update({ status: AccountStatus.INACTIVE });
  }

  // ── Transfers ────────────────────────────────────────────────────────────

  async findTransfers(userId: string, accountId?: string): Promise<AccountTransfer[]> {
    const where: Record<string | symbol, unknown> = { userId };
    if (accountId) {
      where[Op.or] = [{ fromAccountId: accountId }, { toAccountId: accountId }];
    }
    return AccountTransfer.findAll({
      where,
      include: [
        { model: Account, as: 'fromAccount', attributes: ['id', 'name'] },
        { model: Account, as: 'toAccount', attributes: ['id', 'name'] },
      ],
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });
  }

  async createTransfer(userId: string, dto: CreateTransferDto): Promise<AccountTransfer> {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Source and destination accounts must be different');
    }
    await this.getOwned(dto.fromAccountId, userId);
    await this.getOwned(dto.toAccountId, userId);
    return AccountTransfer.create({
      ...dto,
      date: this.normalizeDate(dto.date),
      userId,
    });
  }

  async removeTransfer(id: string, userId: string): Promise<void> {
    const transfer = await AccountTransfer.findOne({ where: { id, userId } });
    if (!transfer) throw new NotFoundException('Transfer not found');
    await transfer.destroy();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async getOwned(id: string, userId: string): Promise<Account> {
    const account = await Account.findOne({ where: { id, userId } });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  private async withBalance(account: Account, asOf?: string): Promise<AccountWithBalance> {
    const { balance, anchor } = await this.balanceService.getAccountBalance(
      account,
      this.normalizeDate(asOf),
    );
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      initialBalance: Number(account.initialBalance),
      isDefault: account.isDefault,
      status: account.status,
      balance,
      lastReconciliation: anchor,
    };
  }

  private normalizeDate(date?: string): string {
    return date ? date.slice(0, 10) : todayStr();
  }
}
