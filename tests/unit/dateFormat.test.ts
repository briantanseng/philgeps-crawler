import { formatDate, formatDuration, formatNumber } from '@/lib/utils/dateFormat';

describe('Date Formatting Utilities', () => {
  describe('formatDate', () => {
    it('should format date string correctly', () => {
      const result = formatDate('2025-05-29T10:30:00Z');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('should format Date object correctly', () => {
      const date = new Date('2025-05-29T10:30:00Z');
      const result = formatDate(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('should handle invalid date', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('Invalid date');
    });

    it('should pad single digits with zero', () => {
      const date = new Date('2025-01-05T09:05:00');
      const result = formatDate(date);
      expect(result).toContain('-01-');
      expect(result).toContain(' 09:05');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds to minutes and seconds', () => {
      expect(formatDuration(0)).toBe('0m 0s');
      expect(formatDuration(30)).toBe('0m 30s');
      expect(formatDuration(60)).toBe('1m 0s');
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(125)).toBe('2m 5s');
    });

    it('should round seconds', () => {
      expect(formatDuration(30.4)).toBe('0m 30s');
      expect(formatDuration(30.6)).toBe('0m 31s');
    });

    it('should handle large durations', () => {
      expect(formatDuration(3600)).toBe('60m 0s');
      expect(formatDuration(7265)).toBe('121m 5s');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with comma separators', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(100)).toBe('100');
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(10000)).toBe('10,000');
      expect(formatNumber(100000)).toBe('100,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1000)).toBe('-1,000');
      expect(formatNumber(-1000000)).toBe('-1,000,000');
    });

    it('should handle decimal numbers', () => {
      expect(formatNumber(1000.5)).toBe('1,000.5');
      expect(formatNumber(1000000.99)).toBe('1,000,000.99');
    });
  });
});