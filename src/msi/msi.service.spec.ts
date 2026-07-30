import { MsiService } from './msi.service';
import { Transaction } from '../transactions/models/transaction.model';
import { Card } from '../cards/models/card.model';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

describe('MsiService', () => {
  let service: MsiService;

  beforeEach(() => {
    service = new MsiService(null as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getYearlyProjection', () => {
    it('counts a single MSI group only once per month, not once per installment row (regression for the double-counting bug)', async () => {
      // A 3-month MSI purchase billed on the 15th of Jan/Feb/Mar 2026.
      // Total should be 100 exactly (33.33 + 33.33 + 33.34, per the Fase 0
      // rounding fix), and the correct "remaining debt" per month is the sum
      // of installments not yet billed as of that month — NOT each row
      // independently contributing its own remainingMonths * amount.
      const parent = {
        id: 'p1',
        cardId: 'card-1',
        date: new Date(2026, 0, 15),
        amount: 33.33,
        description: 'Laptop (1/3)',
        installmentMonths: 3,
        installmentCurrent: 1,
        parentTransactionId: null,
      } as unknown as Transaction;
      const child2 = {
        id: 'c2',
        cardId: 'card-1',
        date: new Date(2026, 1, 15),
        amount: 33.33,
        description: 'Laptop (2/3)',
        installmentMonths: 3,
        installmentCurrent: 2,
        parentTransactionId: 'p1',
      } as unknown as Transaction;
      const child3 = {
        id: 'c3',
        cardId: 'card-1',
        date: new Date(2026, 2, 15),
        amount: 33.34,
        description: 'Laptop (3/3)',
        installmentMonths: 3,
        installmentCurrent: 3,
        parentTransactionId: 'p1',
      } as unknown as Transaction;

      jest.spyOn(Card, 'findAll').mockResolvedValue([
        { id: 'card-1', name: 'Visa Oro', network: 'visa', last4: '1234' },
      ] as any);
      jest
        .spyOn(Transaction, 'findAll')
        .mockResolvedValue([parent, child2, child3] as any);

      const result = await service.getYearlyProjection('user-1', 2026);
      const projection = result.cards[0].projection;

      expect(projection[0].totalDebt).toBeCloseTo(100, 2); // January: nothing billed yet
      expect(projection[1].totalDebt).toBeCloseTo(66.67, 2); // February: Jan already billed
      expect(projection[2].totalDebt).toBeCloseTo(33.34, 2); // March: only the last installment left
      expect(projection[3].totalDebt).toBe(0); // April: fully paid off
      expect(projection[3].isPaidOff).toBe(true);
      expect(projection[0].msiDetails).toHaveLength(1); // one entry per GROUP, not per row
    });

    it('monthlyPaymentDue stays flat across the active window instead of declining like totalDebt', async () => {
      // Same 3-month/$100 purchase as above. totalDebt declines 100 → 66.67 → 33.34,
      // but the actual monthly charge is constant: 33.33 / 33.33 / 33.34.
      const parent = {
        id: 'p1',
        cardId: 'card-1',
        date: new Date(2026, 0, 15),
        amount: 33.33,
        description: 'Laptop (1/3)',
        installmentMonths: 3,
        installmentCurrent: 1,
        parentTransactionId: null,
      } as unknown as Transaction;
      const child2 = {
        id: 'c2',
        cardId: 'card-1',
        date: new Date(2026, 1, 15),
        amount: 33.33,
        description: 'Laptop (2/3)',
        installmentMonths: 3,
        installmentCurrent: 2,
        parentTransactionId: 'p1',
      } as unknown as Transaction;
      const child3 = {
        id: 'c3',
        cardId: 'card-1',
        date: new Date(2026, 2, 15),
        amount: 33.34,
        description: 'Laptop (3/3)',
        installmentMonths: 3,
        installmentCurrent: 3,
        parentTransactionId: 'p1',
      } as unknown as Transaction;

      jest.spyOn(Card, 'findAll').mockResolvedValue([
        { id: 'card-1', name: 'Visa Oro', network: 'visa', last4: '1234' },
      ] as any);
      jest
        .spyOn(Transaction, 'findAll')
        .mockResolvedValue([parent, child2, child3] as any);

      const result = await service.getYearlyProjection('user-1', 2026);
      const projection = result.cards[0].projection;

      expect(projection[0].monthlyPaymentDue).toBeCloseTo(33.33, 2);
      expect(projection[1].monthlyPaymentDue).toBeCloseTo(33.33, 2);
      expect(projection[2].monthlyPaymentDue).toBeCloseTo(33.34, 2);
      expect(projection[3].monthlyPaymentDue).toBe(0); // April: nothing charged that month
      expect(projection[0].msiDetails[0].amountDueThisMonth).toBeCloseTo(33.33, 2);
      expect(result.paymentDueByMonth[0]).toBeCloseTo(33.33, 2);
    });

    it('does not count a purchase as debt in months before it was made (regression: pre-purchase months showed the full balance)', async () => {
      // A 3-month MSI purchase made in June 2026 (billed Jun/Jul/Aug). Months
      // January through May 2026 predate the purchase entirely and must show
      // zero MSI debt for this card — not the full remaining balance.
      const parent = {
        id: 'p1',
        cardId: 'card-1',
        date: new Date(2026, 5, 15), // June 15
        amount: 30,
        description: 'Bocinas (1/3)',
        installmentMonths: 3,
        installmentCurrent: 1,
        parentTransactionId: null,
      } as unknown as Transaction;
      const child2 = {
        id: 'c2',
        cardId: 'card-1',
        date: new Date(2026, 6, 15), // July 15
        amount: 30,
        description: 'Bocinas (2/3)',
        installmentMonths: 3,
        installmentCurrent: 2,
        parentTransactionId: 'p1',
      } as unknown as Transaction;
      const child3 = {
        id: 'c3',
        cardId: 'card-1',
        date: new Date(2026, 7, 15), // August 15
        amount: 30,
        description: 'Bocinas (3/3)',
        installmentMonths: 3,
        installmentCurrent: 3,
        parentTransactionId: 'p1',
      } as unknown as Transaction;

      jest.spyOn(Card, 'findAll').mockResolvedValue([
        { id: 'card-1', name: 'Visa Oro', network: 'visa', last4: '1234' },
      ] as any);
      jest
        .spyOn(Transaction, 'findAll')
        .mockResolvedValue([parent, child2, child3] as any);

      const result = await service.getYearlyProjection('user-1', 2026);
      const projection = result.cards[0].projection;

      // Jan (index 0) .. May (index 4): purchase hadn't happened yet.
      for (let i = 0; i < 5; i++) {
        expect(projection[i].totalDebt).toBe(0);
        expect(projection[i].msiDetails).toHaveLength(0);
      }
      // June onward: the purchase is live.
      expect(projection[5].totalDebt).toBeCloseTo(90, 2);
      expect(projection[7].totalDebt).toBeCloseTo(30, 2);
      expect(projection[8].totalDebt).toBe(0);
    });
  });

  describe('getMsiGroups', () => {
    it('classifies groups as active/completed and filters by status', async () => {
      const today = new Date();

      // Group A: still has installments due this month and next → active.
      const groupA = [
        {
          id: 'a1',
          cardId: 'card-1',
          card: { name: 'Visa Oro', last4: '1234' },
          date: addMonths(today, -1),
          amount: 100,
          description: 'Bocinas (1/3)',
          categoryId: 'cat-1',
          installmentMonths: 3,
          installmentCurrent: 1,
          parentTransactionId: null,
        },
        {
          id: 'a2',
          cardId: 'card-1',
          card: { name: 'Visa Oro', last4: '1234' },
          date: today,
          amount: 100,
          description: 'Bocinas (2/3)',
          categoryId: 'cat-1',
          installmentMonths: 3,
          installmentCurrent: 2,
          parentTransactionId: 'a1',
        },
        {
          id: 'a3',
          cardId: 'card-1',
          card: { name: 'Visa Oro', last4: '1234' },
          date: addMonths(today, 1),
          amount: 100,
          description: 'Bocinas (3/3)',
          categoryId: 'cat-1',
          installmentMonths: 3,
          installmentCurrent: 3,
          parentTransactionId: 'a1',
        },
      ] as unknown as Transaction[];

      // Group B: every installment already billed in the past → completed.
      const groupB = [
        {
          id: 'b1',
          cardId: 'card-1',
          card: { name: 'Visa Oro', last4: '1234' },
          date: addMonths(today, -3),
          amount: 50,
          description: 'Audifonos (1/2)',
          categoryId: 'cat-1',
          installmentMonths: 2,
          installmentCurrent: 1,
          parentTransactionId: null,
        },
        {
          id: 'b2',
          cardId: 'card-1',
          card: { name: 'Visa Oro', last4: '1234' },
          date: addMonths(today, -2),
          amount: 50,
          description: 'Audifonos (2/2)',
          categoryId: 'cat-1',
          installmentMonths: 2,
          installmentCurrent: 2,
          parentTransactionId: 'b1',
        },
      ] as unknown as Transaction[];

      jest
        .spyOn(Transaction, 'findAll')
        .mockResolvedValue([...groupA, ...groupB] as any);

      const all = await service.getMsiGroups('user-1');
      expect(all).toHaveLength(2);

      const activeOnly = await service.getMsiGroups('user-1', { status: 'active' });
      expect(activeOnly).toHaveLength(1);
      expect(activeOnly[0].parentTransactionId).toBe('a1');
      expect(activeOnly[0].remainingMonths).toBe(2);
      expect(activeOnly[0].installmentsPaid).toBe(1);

      const completedOnly = await service.getMsiGroups('user-1', { status: 'completed' });
      expect(completedOnly).toHaveLength(1);
      expect(completedOnly[0].parentTransactionId).toBe('b1');
      expect(completedOnly[0].remainingMonths).toBe(0);
    });
  });
});
