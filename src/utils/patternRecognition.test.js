import { describe, it, expect } from 'vitest';
import { computeRemittancePatterns } from './patternRecognition';
import { getMockHistory } from '../services/mockData';

describe('computeRemittancePatterns', () => {
  it('computes correct metrics from mock remittance history', () => {
    const history = getMockHistory();
    const result = computeRemittancePatterns(history);

    expect(result.hasEnoughData).toBe(true);
    expect(result.totalTransfers).toBe(8);
    expect(result.avgDaysBetweenTransfers).toBeGreaterThan(0);
    expect(result.avgDaysToConvert).toBeGreaterThanOrEqual(0);
    expect(result.expectedNextDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.topChannel).toBeTruthy();
    expect(result.avgAmount).toBeGreaterThan(0);
  });

  it('handles empty or null history gracefully', () => {
    expect(computeRemittancePatterns([])).toEqual({
      hasEnoughData: false,
      avgDaysBetweenTransfers: 0,
      avgDaysToConvert: 0,
      expectedNextDate: null,
      totalTransfers: 0,
      topChannel: null,
      avgAmount: 0,
    });

    expect(computeRemittancePatterns(null)).toEqual({
      hasEnoughData: false,
      avgDaysBetweenTransfers: 0,
      avgDaysToConvert: 0,
      expectedNextDate: null,
      totalTransfers: 0,
      topChannel: null,
      avgAmount: 0,
    });
  });

  it('handles single transfer entry (insufficient data for pattern interval)', () => {
    const singleHistory = [
      { date: '2026-08-01', amount: 500, channel: 'Wise' },
    ];
    const result = computeRemittancePatterns(singleHistory);

    expect(result.hasEnoughData).toBe(false);
    expect(result.totalTransfers).toBe(1);
    expect(result.avgDaysBetweenTransfers).toBe(0);
    expect(result.topChannel).toBe('Wise');
    expect(result.avgAmount).toBe(500);
  });

  it('correctly sorts unsorted dates and calculates interval', () => {
    const unsorted = [
      { date: '2026-08-20', amount: 300, channel: 'Wise' },
      { date: '2026-08-01', amount: 300, channel: 'Wise' },
      { date: '2026-08-10', amount: 300, channel: 'Wise' },
    ];
    const result = computeRemittancePatterns(unsorted);

    expect(result.hasEnoughData).toBe(true);
    // Intervals: 08-01 to 08-10 (9 days), 08-10 to 08-20 (10 days) => Avg: 9.5 days
    expect(result.avgDaysBetweenTransfers).toBe(9.5);
    // Next expected date: 2026-08-20 + 10 days = 2026-08-30
    expect(result.expectedNextDate).toBe('2026-08-30');
  });

  it('uses custom conversion delays if present on entries', () => {
    const historyWithDelays = [
      { date: '2026-08-01', amount: 200, channel: 'Remitly', convertedDays: 2 },
      { date: '2026-08-11', amount: 200, channel: 'Remitly', convertedDays: 4 },
    ];
    const result = computeRemittancePatterns(historyWithDelays);

    expect(result.avgDaysToConvert).toBe(3);
  });

  it('generates a valid pattern insight message from getPatternInsight', async () => {
    const { getPatternInsight } = await import('../services/aiCoach');
    const history = getMockHistory();
    const result = computeRemittancePatterns(history);
    const insight = await getPatternInsight(result);

    expect(insight).toBeTruthy();
    expect(typeof insight).toBe('string');
    expect(insight).toContain('Wise');
    expect(insight).toContain('8 transfers');
  });
});

