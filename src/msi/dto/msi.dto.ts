export interface MsiDetail {
  transactionId: string;
  description: string;
  monthlyAmount: number;
  remainingMonths: number;
  totalMonths: number;
  /** What this group actually charges in this specific projected month —
   * constant across its active window (e.g. 1000/1000/1000 for a 3k/3-month
   * purchase), unlike monthlyAmount+remainingMonths which describe the
   * declining remaining balance. 0 if this group isn't billed this month. */
  amountDueThisMonth: number;
}

export interface MonthProjection {
  month: number;
  totalDebt: number;
  msiDebt: number;
  /** Sum of amountDueThisMonth across every active group — the flat
   * "what actually hits your statement this month" figure, as opposed to
   * totalDebt/msiDebt which is the declining remaining balance. */
  monthlyPaymentDue: number;
  msiDetails: MsiDetail[];
  isPaidOff: boolean;
}

export interface CardYearlyProjection {
  cardId: string;
  cardName: string;
  network: string | null;
  last4: string | null;
  maxDebt: number;
  maxPaymentDue: number;
  projection: MonthProjection[];
}

export interface YearlyProjectionResponse {
  year: number;
  cards: CardYearlyProjection[];
  totalMaxDebt: number;
  totalMaxPaymentDue: number;
  /** Sum of every card's remaining debt for each of the 12 months — lets the
   * frontend show a portfolio-wide total instead of only per-card figures
   * that are each scaled against their own max. */
  totalByMonth: number[];
  /** Same idea as totalByMonth, but for monthlyPaymentDue instead of totalDebt. */
  paymentDueByMonth: number[];
}

export type MsiGroupStatus = 'active' | 'completed';

export interface MsiGroupSummary {
  parentTransactionId: string;
  description: string;
  categoryId: string;
  cardId: string;
  cardName: string;
  cardLast4: string | null;
  totalMonths: number;
  monthlyAmount: number;
  totalAmount: number;
  remainingAmount: number;
  remainingMonths: number;
  installmentsPaid: number;
  startDate: string;
  endDate: string;
  status: MsiGroupStatus;
}

export interface MsiGroupFilters {
  cardId?: string;
  status?: MsiGroupStatus;
}
