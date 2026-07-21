import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Subscription } from './models/subscription.model';
import { SubscriptionPayment } from './models/subscription-payment.model';
import { Transaction, TransactionType } from '../transactions/models/transaction.model';
import { clampSubscriptionDay, getDaysInMonth } from './utils/subscription-date.util';

const CRON_TIMEZONE = process.env.SUBSCRIPTION_CRON_TIMEZONE || 'America/Mexico_City';

@Injectable()
export class SubscriptionAutoChargeService {
  private readonly logger = new Logger(SubscriptionAutoChargeService.name);

  @Cron('0 6 * * *', { timeZone: CRON_TIMEZONE })
  async handleDailyAutoCharge(): Promise<void> {
    const { year, month, day } = this.getTodayInTz(CRON_TIMEZONE);
    const daysInMonth = getDaysInMonth(year, month);

    const subscriptions = await Subscription.findAll({ where: { isActive: true } });

    for (const subscription of subscriptions) {
      try {
        await this.chargeIfDue(subscription, year, month, day, daysInMonth);
      } catch (err) {
        this.logger.error(
          `Failed to auto-charge subscription ${subscription.id}: ${err}`,
        );
      }
    }
  }

  private async chargeIfDue(
    subscription: Subscription,
    year: number,
    month: number,
    day: number,
    daysInMonth: number,
  ): Promise<void> {
    const effectiveDay = clampSubscriptionDay(subscription.paymentDay, daysInMonth);
    if (day < effectiveDay) return;

    const existing = await SubscriptionPayment.findOne({
      where: { subscriptionId: subscription.id, periodYear: year, periodMonth: month },
    });
    if (existing) return;

    const pad = (n: number) => String(n).padStart(2, '0');
    const paymentDate = `${year}-${pad(month)}-${pad(effectiveDay)}`;
    const txType = subscription.cardId
      ? TransactionType.CARD_PURCHASE
      : TransactionType.EXPENSE;

    const transaction = await Transaction.create({
      userId: subscription.userId,
      type: txType,
      amount: subscription.amount,
      categoryId: subscription.categoryId,
      cardId: subscription.cardId ?? null,
      description: subscription.name,
      date: new Date(`${paymentDate}T12:00:00`),
      notes: `Pago automático de suscripción: ${subscription.name}`,
    });

    await SubscriptionPayment.create({
      subscriptionId: subscription.id,
      amount: subscription.amount,
      paymentDate,
      periodYear: year,
      periodMonth: month,
      isAutomatic: true,
      transactionId: transaction.id,
    });

    this.logger.log(`Auto-charged subscription ${subscription.id} (${subscription.name})`);
  }

  private getTodayInTz(timeZone: string): { year: number; month: number; day: number } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
    return { year: get('year'), month: get('month'), day: get('day') };
  }
}
