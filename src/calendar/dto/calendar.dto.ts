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
