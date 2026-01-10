import { CardSummaryService } from './card-summary.service';
import { Card, CardType, PaymentDueType } from './models/card.model';

describe('CardSummaryService', () => {
  let service: CardSummaryService;

  beforeEach(() => {
    // Create service with null sequelize since we're testing pure functions
    service = new CardSummaryService(null as any);
  });

  describe('getNextCutoffDate', () => {
    it('should return this month cutoff if today <= cutoffDay', () => {
      const today = new Date(2024, 0, 10); // January 10, 2024
      const cutoffDay = 15;

      const result = service.getNextCutoffDate(cutoffDay, today);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(15);
    });

    it('should return next month cutoff if today > cutoffDay', () => {
      const today = new Date(2024, 0, 20); // January 20, 2024
      const cutoffDay = 15;

      const result = service.getNextCutoffDate(cutoffDay, today);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(15);
    });

    it('should handle cutoffDay=31 in February (use 28/29)', () => {
      const today = new Date(2024, 1, 1); // February 1, 2024 (leap year)
      const cutoffDay = 31;

      const result = service.getNextCutoffDate(cutoffDay, today);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(29); // Leap year
    });

    it('should handle cutoffDay=31 in February non-leap year', () => {
      const today = new Date(2023, 1, 1); // February 1, 2023 (non-leap year)
      const cutoffDay = 31;

      const result = service.getNextCutoffDate(cutoffDay, today);

      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(28); // Non-leap year
    });

    it('should handle cutoffDay=30 in February', () => {
      const today = new Date(2024, 1, 1); // February 1, 2024
      const cutoffDay = 30;

      const result = service.getNextCutoffDate(cutoffDay, today);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(29); // Leap year, max is 29
    });

    it('should handle year overflow (December to January)', () => {
      const today = new Date(2024, 11, 20); // December 20, 2024
      const cutoffDay = 15;

      const result = service.getNextCutoffDate(cutoffDay, today);

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(15);
    });

    it('should return same day if today equals cutoffDay', () => {
      const today = new Date(2024, 0, 15); // January 15, 2024
      const cutoffDay = 15;

      const result = service.getNextCutoffDate(cutoffDay, today);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(15);
    });
  });

  describe('getNextDueDate', () => {
    it('should calculate fixed day correctly', () => {
      const card = {
        paymentDueType: PaymentDueType.FIXED_DAY_OF_MONTH,
        paymentDueValue: 20,
      } as Card;
      const nextCutoff = new Date(2024, 0, 15); // January 15, 2024

      const result = service.getNextDueDate(card, nextCutoff);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(20);
    });

    it('should calculate days after cutoff correctly', () => {
      const card = {
        paymentDueType: PaymentDueType.DAYS_AFTER_CUTOFF,
        paymentDueValue: 10,
      } as Card;
      const nextCutoff = new Date(2024, 0, 15); // January 15, 2024

      const result = service.getNextDueDate(card, nextCutoff);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(25); // 15 + 10
    });

    it('should handle month overflow for days after cutoff', () => {
      const card = {
        paymentDueType: PaymentDueType.DAYS_AFTER_CUTOFF,
        paymentDueValue: 20,
      } as Card;
      const nextCutoff = new Date(2024, 0, 25); // January 25, 2024

      const result = service.getNextDueDate(card, nextCutoff);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(14); // 25 + 20 = Feb 14
    });

    it('should handle fixed day in month with fewer days', () => {
      const card = {
        paymentDueType: PaymentDueType.FIXED_DAY_OF_MONTH,
        paymentDueValue: 31,
      } as Card;
      const nextCutoff = new Date(2024, 1, 15); // February 15, 2024

      const result = service.getNextDueDate(card, nextCutoff);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(29); // Leap year, max is 29
    });
  });

  describe('getValidDayOfMonth (private, tested through public methods)', () => {
    it('should return original day if month has enough days', () => {
      const today = new Date(2024, 0, 1); // January
      const cutoffDay = 25;

      const result = service.getNextCutoffDate(cutoffDay, today);

      expect(result.getDate()).toBe(25);
    });

    it('should return last day of month if day exceeds month length', () => {
      const today = new Date(2024, 1, 1); // February 2024 (leap year)
      const cutoffDay = 31;

      const result = service.getNextCutoffDate(cutoffDay, today);

      expect(result.getDate()).toBe(29);
    });
  });
});
