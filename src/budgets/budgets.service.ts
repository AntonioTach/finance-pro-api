import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../config/database.provider';
import { Sequelize } from 'sequelize-typescript';
import { Budget, BudgetPeriod } from './models/budget.model';
import { BudgetAlert, BudgetAlertType } from './models/budget-alert.model';
import { Category } from '../categories/models/category.model';
import { Transaction } from '../transactions/models/transaction.model';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { Op } from 'sequelize';

// ── Date helpers (no external dependency) ────────────────────────────────────

function startOfWeekMon(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeekMon(date: Date): Date {
  const d = startOfWeekMon(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function endOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/** ISO week number (1–53) */
function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function padded(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}

function fmtYYYYMM(d: Date): string {
  return `${d.getFullYear()}-${padded(d.getMonth() + 1)}`;
}

// ── Period helpers ────────────────────────────────────────────────────────────

export interface PeriodRange {
  start: Date;
  end: Date;
  key: string;
}

export function getActivePeriod(budget: Budget, now = new Date()): PeriodRange {
  switch (budget.period) {
    case BudgetPeriod.WEEKLY: {
      const start = startOfWeekMon(now);
      const end   = endOfWeekMon(now);
      const week  = isoWeek(now);
      return { start, end, key: `${now.getFullYear()}-W${padded(week)}` };
    }

    case BudgetPeriod.BIWEEKLY: {
      const anchor = new Date(budget.startDate);
      anchor.setHours(0, 0, 0, 0);
      const daysSince   = Math.max(0, diffDays(now, anchor));
      const periods     = Math.floor(daysSince / 14);
      const start       = addDays(anchor, periods * 14);
      const end         = addDays(start, 13);
      end.setHours(23, 59, 59, 999);
      return {
        start,
        end,
        key: `${start.getFullYear()}-${padded(start.getMonth() + 1)}-${padded(start.getDate())}`,
      };
    }

    case BudgetPeriod.MONTHLY: {
      const start = startOfMonth(now);
      const end   = endOfMonth(now);
      return { start, end, key: fmtYYYYMM(now) };
    }

    case BudgetPeriod.YEARLY: {
      const start = startOfYear(now);
      const end   = endOfYear(now);
      return { start, end, key: String(now.getFullYear()) };
    }

    case BudgetPeriod.CUSTOM:
    default: {
      const start = new Date(budget.startDate);
      const end   = budget.endDate ? new Date(budget.endDate) : now;
      return {
        start,
        end,
        key: `${start.getFullYear()}-${padded(start.getMonth() + 1)}-${padded(start.getDate())}`,
      };
    }
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class BudgetsService {
  constructor(
    @Inject(DATABASE_PROVIDER)
    private readonly sequelize: Sequelize,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateBudgetDto): Promise<Budget> {
    await this.validateCategoryOwnership(userId, dto.categoryId);
    await this.checkDuplicateBudget(userId, dto.categoryId, dto.period);

    const budget = await Budget.create({
      ...dto,
      userId,
      name: dto.name || null,
      alertThreshold: dto.alertThreshold ?? 80,
      rolloverEnabled: dto.rolloverEnabled ?? false,
      autoRenew: dto.autoRenew ?? true,
      isActive: true,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });

    return this.findOne(budget.id, userId);
  }

  async findAll(userId: string): Promise<Budget[]> {
    return Budget.findAll({
      where: { userId, isActive: true },
      include: [{ model: Category, as: 'category' }],
      order: [['createdAt', 'DESC']],
    });
  }

  async findOne(id: string, userId: string): Promise<Budget> {
    const budget = await Budget.findOne({
      where: { id, userId },
      include: [{ model: Category, as: 'category' }],
    });
    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  async update(id: string, userId: string, dto: UpdateBudgetDto): Promise<Budget> {
    const budget = await this.findOne(id, userId);

    if (dto.categoryId) {
      await this.validateCategoryOwnership(userId, dto.categoryId);
    }
    if (dto.startDate) (dto as any).startDate = new Date(dto.startDate);
    if (dto.endDate)   (dto as any).endDate   = new Date(dto.endDate);

    await budget.update(dto);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const budget = await this.findOne(id, userId);
    await budget.destroy();
  }

  // ── Progress ──────────────────────────────────────────────────────────────

  async getProgress(id: string, userId: string): Promise<any> {
    const budget = await this.findOne(id, userId);
    const period = getActivePeriod(budget);
    const now    = new Date();

    const [expenses, refunds]: [any[], any[]] = await Promise.all([
      Transaction.findAll({
        where: {
          userId,
          categoryId: budget.categoryId,
          type: 'expense',
          date: { [Op.between]: [period.start, period.end] },
        },
        attributes: [[this.sequelize.fn('SUM', this.sequelize.col('amount')), 'total']],
        raw: true,
      }),
      Transaction.findAll({
        where: {
          userId,
          categoryId: budget.categoryId,
          type: 'income',
          date: { [Op.between]: [period.start, period.end] },
        },
        attributes: [[this.sequelize.fn('SUM', this.sequelize.col('amount')), 'total']],
        raw: true,
      }),
    ]);

    const grossSpent   = Number(expenses[0]?.total || 0);
    const refundAmount = Number(refunds[0]?.total  || 0);
    const spent        = Math.max(0, grossSpent - refundAmount);

    const baseAmount = Number(budget.amount);
    const rollover   = Number(budget.rolloverAmount || 0);
    const amount     = baseAmount + rollover;
    const remaining  = amount - spent;
    const percentage = amount > 0 ? (spent / amount) * 100 : 0;

    const totalDays   = Math.max(1, diffDays(period.end, period.start) + 1);
    const elapsedDays = Math.max(1, diffDays(now, period.start) + 1);
    const daysLeft    = Math.max(0, diffDays(period.end, now));
    const burnRate    = spent / elapsedDays;
    const projected   = burnRate * totalDays;

    return {
      budget: {
        id: budget.id,
        name: budget.name,
        amount,
        baseAmount,
        rollover,
        period: budget.period,
        alertThreshold: budget.alertThreshold,
        periodStart: period.start,
        periodEnd:   period.end,
        category: budget.category,
        autoRenew: budget.autoRenew,
        rolloverEnabled: budget.rolloverEnabled,
        notes: budget.notes,
      },
      spent:      parseFloat(spent.toFixed(2)),
      remaining:  parseFloat(remaining.toFixed(2)),
      percentage: parseFloat(percentage.toFixed(2)),
      isExceeded: spent > amount,
      burnRate:   parseFloat(burnRate.toFixed(2)),
      projected:  parseFloat(projected.toFixed(2)),
      daysLeft,
      totalDays,
      elapsedDays,
    };
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  async getDashboard(userId: string): Promise<any> {
    const budgets      = await this.findAll(userId);
    const progressList = await Promise.all(budgets.map(b => this.getProgress(b.id, userId)));

    const totalBudgeted  = progressList.reduce((s, p) => s + p.budget.amount, 0);
    const totalSpent     = progressList.reduce((s, p) => s + p.spent, 0);
    const totalRemaining = totalBudgeted - totalSpent;
    const globalPct      = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

    const unreadAlerts = await BudgetAlert.count({ where: { userId, isRead: false } });

    return {
      totalBudgeted:    parseFloat(totalBudgeted.toFixed(2)),
      totalSpent:       parseFloat(totalSpent.toFixed(2)),
      totalRemaining:   parseFloat(totalRemaining.toFixed(2)),
      globalPercentage: parseFloat(globalPct.toFixed(2)),
      unreadAlerts,
      budgets: progressList,
    };
  }

  // ── Suggestions ───────────────────────────────────────────────────────────

  async getSuggestions(userId: string): Promise<any[]> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const rows: any[] = await Transaction.findAll({
      where: {
        userId,
        type: 'expense',
        date: { [Op.gte]: threeMonthsAgo },
      },
      attributes: [
        'categoryId',
        [this.sequelize.fn('SUM', this.sequelize.col('amount')), 'total'],
        [
          this.sequelize.fn(
            'COUNT',
            this.sequelize.literal("DISTINCT DATE_TRUNC('month', date)"),
          ),
          'months',
        ],
      ],
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
      group: ['categoryId', 'category.id'],
      raw: false,
    });

    return rows.map((r: any) => ({
      categoryId: r.categoryId,
      category: r.category,
      monthlyAverage: parseFloat(
        (Number(r.getDataValue('total')) / Math.max(1, Number(r.getDataValue('months')))).toFixed(2),
      ),
      totalLast3Months: parseFloat(Number(r.getDataValue('total')).toFixed(2)),
    }));
  }

  // ── Transactions of the active period ────────────────────────────────────

  async getPeriodTransactions(id: string, userId: string): Promise<any> {
    const budget = await this.findOne(id, userId);
    const period = getActivePeriod(budget);

    const transactions = await Transaction.findAll({
      where: {
        userId,
        categoryId: budget.categoryId,
        type: { [Op.in]: ['expense', 'income'] },
        date: { [Op.between]: [period.start, period.end] },
      },
      order: [['date', 'DESC']],
    });

    return { periodStart: period.start, periodEnd: period.end, transactions };
  }

  // ── Alerts ────────────────────────────────────────────────────────────────

  async getAlerts(userId: string): Promise<BudgetAlert[]> {
    return BudgetAlert.findAll({
      where: { userId, isRead: false },
      include: [
        {
          model: Budget,
          as: 'budget',
          include: [{ model: Category, as: 'category' }],
        },
      ],
      order: [['triggeredAt', 'DESC']],
      limit: 50,
    });
  }

  async markAlertRead(alertId: string, userId: string): Promise<void> {
    const alert = await BudgetAlert.findOne({ where: { id: alertId, userId } });
    if (!alert) throw new NotFoundException('Alert not found');
    await alert.update({ isRead: true });
  }

  async markAllAlertsRead(userId: string): Promise<void> {
    await BudgetAlert.update({ isRead: true }, { where: { userId } });
  }

  async checkAlerts(userId: string, categoryId: string): Promise<void> {
    const budgets = await Budget.findAll({
      where: { userId, categoryId, isActive: true },
      include: [{ model: Category, as: 'category' }],
    });

    for (const budget of budgets) {
      const progress = await this.getProgress(budget.id, userId);
      const { percentage, isExceeded, budget: { alertThreshold } } = progress;
      const periodKey = getActivePeriod(budget).key;

      await this.maybeCreateAlerts(budget, userId, periodKey, percentage, alertThreshold, isExceeded);
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async maybeCreateAlerts(
    budget: Budget,
    userId: string,
    periodKey: string,
    percentage: number,
    threshold: number,
    isExceeded: boolean,
  ): Promise<void> {
    const budgetLabel = budget.name || (budget.category as any)?.name || 'presupuesto';

    const checks: { type: BudgetAlertType; minPct: number; msg: string }[] = [
      {
        type: BudgetAlertType.THRESHOLD_50,
        minPct: 50,
        msg: `Llevas el 50% de tu presupuesto "${budgetLabel}"`,
      },
      {
        type: BudgetAlertType.THRESHOLD_80,
        minPct: threshold,
        msg: `Atención: usaste el ${Math.round(percentage)}% de "${budgetLabel}"`,
      },
      {
        type: BudgetAlertType.THRESHOLD_100,
        minPct: 100,
        msg: `Llegaste al límite de "${budgetLabel}"`,
      },
    ];

    for (const check of checks) {
      if (percentage >= check.minPct) {
        await this.upsertAlert(budget.id, userId, check.type, periodKey, percentage, check.msg);
      }
    }

    if (isExceeded) {
      await this.upsertAlert(
        budget.id,
        userId,
        BudgetAlertType.EXCEEDED,
        periodKey,
        percentage,
        `Excediste tu presupuesto "${budgetLabel}"`,
      );
    }
  }

  private async upsertAlert(
    budgetId: string,
    userId: string,
    type: BudgetAlertType,
    periodKey: string,
    percentage: number,
    message: string,
  ): Promise<void> {
    const existing = await BudgetAlert.findOne({ where: { budgetId, type, periodKey } });
    if (existing) return;

    await BudgetAlert.create({
      budgetId,
      userId,
      type,
      triggeredAt: new Date(),
      isRead: false,
      message,
      percentage,
      periodKey,
    });
  }

  private async validateCategoryOwnership(userId: string, categoryId: string): Promise<void> {
    const category = await Category.findByPk(categoryId);
    if (!category) throw new NotFoundException('Category not found');
    if (category.userId !== userId) throw new ForbiddenException('Category does not belong to user');
  }

  private async checkDuplicateBudget(
    userId: string,
    categoryId: string,
    period: BudgetPeriod,
  ): Promise<void> {
    if (period === BudgetPeriod.CUSTOM) return;

    const existing = await Budget.findOne({
      where: { userId, categoryId, period, isActive: true },
    });
    if (existing) {
      throw new ConflictException(
        'An active budget for this category and period already exists',
      );
    }
  }
}
