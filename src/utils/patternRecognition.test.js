import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeRemittancePatterns, formatPatternData, checkProactiveNudge } from './patternRecognition';

describe('Pattern Recognition Engine', () => {
  const mockHistory = [
    { date: '2026-07-01', amount: 500, channel: 'Wise', currency: 'USD' },
    { date: '2026-08-01', amount: 600, channel: 'Remitly', currency: 'USD' },
    { date: '2026-09-01', amount: 550, channel: 'Wise', currency: 'USD' },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes patterns accurately and rounds integers', () => {
    const patterns = computeRemittancePatterns(mockHistory);
    expect(patterns.avgDaysBetweenTransfers).toBe(31);
    expect(patterns.topChannel).toBe('Wise');
    expect(patterns.avgAmount).toBe(550); // (500+600+550)/3 = 550
    expect(patterns.expectedNextDate).toBe('2026-10-02'); // Sep 1 + 31 days = Oct 2
  });

  it('formats pattern data into readable strings', () => {
    const patterns = computeRemittancePatterns(mockHistory);
    const formatted = formatPatternData(patterns);
    expect(formatted.expectedNextDateFormatted).toBe('October 2');
    expect(formatted.avgAmountFormatted).toBe('~$550 USD');
  });

  it('triggers proactive nudge within 48 hours when trend is peaking', () => {
    // 2026-09-30 is today. 2026-10-01 is tomorrow (within 48 hrs)
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
