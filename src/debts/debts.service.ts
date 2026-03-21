import { Injectable, NotFoundException } from '@nestjs/common';
import { Debt, DebtDirection, DebtStatus } from './models/debt.model';
import { DebtPayment } from './models/debt-payment.model';
import { Transaction, TransactionType } from '../transactions/models/transaction.model';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { CreateDebtPaymentDto } from './dto/create-debt-payment.dto';

@Injectable()
export class DebtsService {
  async create(userId: string, dto: CreateDebtDto): Promise<Debt> {
    const debt = await Debt.create({ ...dto, userId });
    return this.findOne(debt.id, userId);
  }

  async findAll(userId: string): Promise<Debt[]> {
    return Debt.findAll({
      where: { userId },
      include: [{ model: DebtPayment, as: 'payments', order: [['payment_date', 'ASC']] }],
      order: [['created_at', 'DESC']],
    });
  }

  async findOne(id: string, userId: string): Promise<Debt> {
    const debt = await Debt.findOne({
      where: { id, userId },
      include: [{ model: DebtPayment, as: 'payments', order: [['payment_date', 'ASC']] }],
    });
    if (!debt) throw new NotFoundException('Debt not found');
    return debt;
  }

  async update(id: string, userId: string, dto: UpdateDebtDto): Promise<Debt> {
    const debt = await this.findOne(id, userId);
    await debt.update(dto);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const debt = await this.findOne(id, userId);

    // Delete all linked transactions before destroying the debt
    const payments = await DebtPayment.findAll({ where: { debtId: id } });
    for (const payment of payments) {
      if (payment.transactionId) {
        await Transaction.destroy({ where: { id: payment.transactionId } });
      }
    }

    await debt.destroy();
  }

  async addPayment(
    debtId: string,
    userId: string,
    dto: CreateDebtPaymentDto,
  ): Promise<Debt> {
    const debt = await this.findOne(debtId, userId);

    // Determine transaction type based on debt direction
    const txType =
      debt.direction === DebtDirection.OWED_BY_ME
        ? TransactionType.EXPENSE
        : TransactionType.INCOME;

    // Create linked transaction
    const transaction = await Transaction.create({
      userId,
      type: txType,
      amount: dto.amount,
      categoryId: dto.categoryId,
      description: `Pago deuda: ${debt.description} (${debt.counterparty})`,
      date: new Date(dto.paymentDate + 'T12:00:00'),
      notes: dto.notes ?? null,
    });

    // Create the payment linked to the transaction
    await DebtPayment.create({
      debtId,
      amount: dto.amount,
      paymentDate: dto.paymentDate,
      installmentNumber: dto.installmentNumber ?? null,
      notes: dto.notes ?? null,
      transactionId: transaction.id,
    });

    // Auto-complete debt if fully paid
    const paidTotal = Number(
      (await DebtPayment.sum('amount', { where: { debtId } })) ?? 0,
    );
    if (paidTotal >= Number(debt.totalAmount)) {
      await debt.update({ status: DebtStatus.COMPLETED });
    }

    return this.findOne(debtId, userId);
  }

  async removePayment(
    debtId: string,
    paymentId: string,
    userId: string,
  ): Promise<Debt> {
    await this.findOne(debtId, userId);

    const payment = await DebtPayment.findOne({ where: { id: paymentId, debtId } });
    if (!payment) throw new NotFoundException('Payment not found');

    // Delete the linked transaction if it exists
    if (payment.transactionId) {
      await Transaction.destroy({ where: { id: payment.transactionId } });
    }

    await payment.destroy();
    return this.findOne(debtId, userId);
  }
}
