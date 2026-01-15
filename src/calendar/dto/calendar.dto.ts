export type CalendarEventType = 'cutoff' | 'due_date' | 'transaction' | 'msi_payment' | 'subscription';

export interface CalendarEvent {
  id: string;
  date: string;
  type: CalendarEventType;
  title: string;
  amount?: number;
  cardId?: string;
  cardName?: string;
  color?: string;
  transactionId?: string;
  subscriptionId?: string;
  installmentInfo?: {
    current: number;
    total: number;
    parentTransactionId: string;
  };
}

export interface CardSummary {
  cardId: string;
  cardName: string;
  network: string | null;
  last4: string | null;
  msiAmount: number;
  purchasesAmount: number;
  subscriptionsAmount: number;
  totalAmount: number;
  dueDate: string | null;
  cutoffDate: string | null;
}

export interface MonthlyCalendarResponse {
  year: number;
  month: number;
  days: {
    day: number;
    date: string;
    events: CalendarEvent[];
  }[];
  summary: {
    totalToPay: number;
    byCard: CardSummary[];
  };
}

export interface MonthProjection {
  month: number;
  totalDebt: number;
  msiDebt: number;
  msiDetails: {
    transactionId: string;
    description: string;
    monthlyAmount: number;
    remainingMonths: number;
    totalMonths: number;
  }[];
  isPaidOff: boolean;
}

export interface CardYearlyProjection {
  cardId: string;
  cardName: string;
  network: string | null;
  last4: string | null;
  maxDebt: number;
  projection: MonthProjection[];
}

export interface YearlyProjectionResponse {
  year: number;
  cards: CardYearlyProjection[];
  totalMaxDebt: number;
}
