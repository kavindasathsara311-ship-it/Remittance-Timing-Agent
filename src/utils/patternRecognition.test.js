import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeRemittancePatterns, formatPatternData, checkProactiveNudge } from './patternRecognition';
import { getMockHistory } from '../services/mockData';

describe('Pattern Recognition Engine', () => {
  const mockHistory = [
    { date: '2026-07-01', amount: 500, channel: 'Wise', currency: 'USD' },
    { date: '2026-08-01', amount: 600, channel: 'Remitly', currency: 'USD' },
    { date: '2026-09-01', amount: 550, channel: 'Wise', currency: 'USD' },
  ];

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
    const emptyRes = computeRemittancePatterns([]);
    expect(emptyRes.hasEnoughData).toBe(false);
    expect(emptyRes.totalTransfers).toBe(0);

    const nullRes = computeRemittancePatterns(null);
    expect(nullRes.hasEnoughData).toBe(false);
    expect(nullRes.totalTransfers).toBe(0);
  });

  it('handles single transfer entry', () => {
    const singleHistory = [
      { date: '2026-08-01', amount: 500, channel: 'Wise', currency: 'USD' },
    ];
    const result = computeRemittancePatterns(singleHistory);

    expect(result.hasEnoughData).toBe(false);
    expect(result.totalTransfers).toBe(1);
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
    expect(result.avgDaysBetweenTransfers).toBe(9.5);
    expect(result.expectedNextDate).toBe('2026-08-30');
  });

  it('formats pattern data into readable strings', () => {
    const patterns = computeRemittancePatterns(mockHistory);
    const formatted = formatPatternData(patterns);
    expect(formatted.expectedNextDateFormatted).toBe('October 2');
    expect(formatted.avgAmountFormatted).toBe('~$550 USD');
  });

  describe('Nudge tests with fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('triggers proactive nudge within 48 hours when trend is peaking', () => {
      const isNudge = checkProactiveNudge('2026-10-01', 'CONVERT_NOW');
      expect(isNudge).toBe(true);
    });

    it('ignores nudge if trend is not peaking', () => {
      const isNudge = checkProactiveNudge('2026-10-01', 'NEUTRAL');
      expect(isNudge).toBe(false);
    });
    
    it('ignores nudge if date is outside 48 hours', () => {
      const isNudge = checkProactiveNudge('2026-10-15', 'CONVERT_NOW');
      expect(isNudge).toBe(false);
    });
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
