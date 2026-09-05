import { describe, it, expect } from 'vitest';
import { getMockHistory } from '../services/mockData';
import {
  MIN_EVENTS_FOR_PATTERN,
  analyseFamilyPattern,
  cadenceLabel,
  isoFromDayIndex,
  localTodayIso,
  median,
  toDayIndex,
} from './familyPattern';

/* =============================================================================
 * familyPattern.test.js — feature #3: "this family's pattern".
 *
 * The pattern is what makes a nudge personal instead of generic, so the tests
 * focus on the three things that would silently break personalisation:
 *   • the cadence math (median, not mean — one odd gap must not move it)
 *   • the next-expected date (the whole trigger for feature #4)
 *   • the corridor/channel tie-breaks (which decide WHOSE money we talk about)
 * ===========================================================================*/

/** n days before `todayIso`, as "YYYY-MM-DD". */
function daysBefore(todayIso, n) {
  return isoFromDayIndex(toDayIndex(todayIso) - n);
}

/** Build a history from `daysAgo` offsets, newest-first like the real data. */
function historyFrom(todayIso, rows) {
  return rows.map((row, i) => ({
    id: `h${i + 1}`,
    date: daysBefore(todayIso, row.daysAgo),
    amount: row.amount ?? 500,
    currency: row.currency ?? 'USD',
    senderCountry: row.senderCountry ?? 'United States',
    channel: row.channel ?? 'Wise',
    rate: row.rate ?? 320,
  }));
}

describe('familyPattern helpers', () => {
  it('round-trips a date through the day index', () => {
    for (const iso of ['2026-09-01', '2026-02-28', '2026-12-31', '2024-02-29']) {
      expect(isoFromDayIndex(toDayIndex(iso))).toBe(iso);
    }
  });

  it('counts whole days between two dates exactly', () => {
    expect(toDayIndex('2026-09-05') - toDayIndex('2026-08-16')).toBe(20);
    expect(toDayIndex('2026-03-01') - toDayIndex('2026-02-28')).toBe(1);
  });

  it('returns null for unparseable dates', () => {
    expect(toDayIndex(null)).toBeNull();
    expect(toDayIndex('')).toBeNull();
    expect(toDayIndex('not-a-date')).toBeNull();
  });

  it('takes the median, so one outlier cannot skew the cadence', () => {
    expect(median([9, 12, 13])).toBe(12);
    expect(median([10, 12])).toBe(11);
    expect(median([])).toBe(0);
    // mean of these is ~20.6; the median stays at 12
    expect(median([9, 12, 12, 13, 60])).toBe(12);
  });

  it('buckets the cadence into human labels', () => {
    expect(cadenceLabel(7)).toBe('weekly');
    expect(cadenceLabel(12)).toBe('fortnightly');
    expect(cadenceLabel(30)).toBe('monthly');
    expect(cadenceLabel(90)).toBe('irregular');
    expect(cadenceLabel(0)).toBe('irregular');
  });
});

describe('analyseFamilyPattern', () => {
  const TODAY = localTodayIso();

  it('derives cadence, next-expected date and corridor from the real demo history', () => {
    const pattern = analyseFamilyPattern(getMockHistory(), TODAY);

    // gaps between the 8 seeded events: 13,12,12,9,14,9,9 -> median 12
    expect(pattern.hasPattern).toBe(true);
    expect(pattern.eventCount).toBe(8);
    expect(pattern.cadenceDays).toBe(12);
    expect(pattern.cadenceLabel).toBe('fortnightly');

    // newest event is 6 days old, so the next one is ~6 days away
    expect(pattern.daysSinceLast).toBe(6);
    expect(pattern.daysUntilExpected).toBe(6);
    expect(pattern.isOverdue).toBe(false);
    expect(pattern.lastTransferDate).toBe(daysBefore(TODAY, 6));
    expect(pattern.nextExpectedDate).toBe(daysBefore(TODAY, -6));

    // USD appears 3x (the most), amounts 500/600/900 -> median 600
    expect(pattern.corridor).toBe('USD');
    expect(pattern.pair).toBe('USD_LKR');
    expect(pattern.senderCountry).toBe('United States');
    expect(pattern.typicalAmount).toBe(600);
    expect(pattern.corridorShare).toBe(0.38);

    // 8 tidy events -> the agent is allowed to be confident
    expect(pattern.confidence).toBe('high');
    expect(pattern.gapSpread).toBeCloseTo(0.42, 2);
  });

  it('stays silent below the minimum event count', () => {
    const short = historyFrom(TODAY, [
      { daysAgo: 4 },
      { daysAgo: MIN_EVENTS_FOR_PATTERN + 10 },
    ]);
    const pattern = analyseFamilyPattern(short, TODAY);

    expect(pattern.hasPattern).toBe(false);
    expect(pattern.eventCount).toBe(2);
    expect(pattern.cadenceDays).toBe(0);
    expect(pattern.nextExpectedDate).toBeNull();
    expect(pattern.corridor).toBeNull();
    expect(pattern.confidence).toBe('low');
  });

  it('reports no pattern for empty, null or garbage input', () => {
    for (const bad of [[], null, undefined, 'nope']) {
      expect(analyseFamilyPattern(bad, TODAY).hasPattern).toBe(false);
    }

    const unparseable = [
      { date: 'nonsense' },
      { date: '' },
      { date: null },
      { date: '2026-01-01' },
    ];
    // only one usable date survives the filter
    expect(analyseFamilyPattern(unparseable, TODAY).eventCount).toBe(1);
    expect(analyseFamilyPattern(unparseable, TODAY).hasPattern).toBe(false);
  });

  it('flags an overdue transfer with a negative days-until value', () => {
    // every 10 days, but the last one landed 20 days ago
    const pattern = analyseFamilyPattern(
      historyFrom(TODAY, [
        { daysAgo: 20 },
        { daysAgo: 30 },
        { daysAgo: 40 },
        { daysAgo: 50 },
      ]),
      TODAY
    );

    expect(pattern.cadenceDays).toBe(10);
    expect(pattern.daysSinceLast).toBe(20);
    expect(pattern.daysUntilExpected).toBe(-10);
    expect(pattern.isOverdue).toBe(true);
    expect(pattern.nextExpectedDate).toBe(daysBefore(TODAY, 10));
  });

  it('sorts unordered input before measuring gaps', () => {
    const shuffled = historyFrom(TODAY, [
      { daysAgo: 20 },
      { daysAgo: 0 },
      { daysAgo: 30 },
      { daysAgo: 10 },
    ]);
    const pattern = analyseFamilyPattern(shuffled, TODAY);

    expect(pattern.cadenceDays).toBe(10);
    expect(pattern.daysSinceLast).toBe(0);
    expect(pattern.daysUntilExpected).toBe(10);
    expect(pattern.lastTransferDate).toBe(TODAY);
  });

  it('picks the most frequent corridor, and the most recent one on a tie', () => {
    const clearWinner = analyseFamilyPattern(
      historyFrom(TODAY, [
        { daysAgo: 5, currency: 'SAR', senderCountry: 'Saudi Arabia' },
        { daysAgo: 15, currency: 'SAR', senderCountry: 'Saudi Arabia' },
        { daysAgo: 25, currency: 'SAR', senderCountry: 'Saudi Arabia' },
        { daysAgo: 35, currency: 'USD' },
      ]),
      TODAY
    );
    expect(clearWinner.corridor).toBe('SAR');
    expect(clearWinner.pair).toBe('SAR_LKR');
    expect(clearWinner.senderCountry).toBe('Saudi Arabia');

    // 2x AED (newest) vs 2x GBP (older) -> the more recent corridor wins
    const tie = analyseFamilyPattern(
      historyFrom(TODAY, [
        { daysAgo: 4, currency: 'AED', senderCountry: 'UAE' },
        { daysAgo: 14, currency: 'GBP', senderCountry: 'United Kingdom' },
        { daysAgo: 24, currency: 'AED', senderCountry: 'UAE' },
        { daysAgo: 34, currency: 'GBP', senderCountry: 'United Kingdom' },
      ]),
      TODAY
    );
    expect(tie.corridor).toBe('AED');
  });

  it('takes the typical amount from the dominant corridor only', () => {
    const pattern = analyseFamilyPattern(
      historyFrom(TODAY, [
        { daysAgo: 5, currency: 'USD', amount: 400 },
        { daysAgo: 15, currency: 'USD', amount: 600 },
        { daysAgo: 25, currency: 'USD', amount: 800 },
        { daysAgo: 35, currency: 'SAR', amount: 5000 },
      ]),
      TODAY
    );

    expect(pattern.corridor).toBe('USD');
    expect(pattern.typicalAmount).toBe(600); // the SAR 5000 is ignored
  });

  it('breaks a channel tie towards the one used most recently', () => {
    const pattern = analyseFamilyPattern(
      historyFrom(TODAY, [
        { daysAgo: 5, channel: 'Remitly' },
        { daysAgo: 15, channel: 'Wise' },
        { daysAgo: 25, channel: 'Instarem' },
      ]),
      TODAY
    );

    expect(pattern.usualChannel).toBe('Remitly');
  });

  it('downgrades confidence on thin or erratic history', () => {
    // only 3 events -> low
    const thin = analyseFamilyPattern(
      historyFrom(TODAY, [{ daysAgo: 5 }, { daysAgo: 15 }, { daysAgo: 25 }]),
      TODAY
    );
    expect(thin.confidence).toBe('low');

    // 4 events -> medium
    const medium = analyseFamilyPattern(
      historyFrom(TODAY, [{ daysAgo: 5 }, { daysAgo: 15 }, { daysAgo: 25 }, { daysAgo: 35 }]),
      TODAY
    );
    expect(medium.confidence).toBe('medium');

    // plenty of events but wildly uneven gaps -> not high
    const erratic = analyseFamilyPattern(
      historyFrom(TODAY, [
        { daysAgo: 2 },
        { daysAgo: 6 },
        { daysAgo: 40 },
        { daysAgo: 44 },
        { daysAgo: 90 },
        { daysAgo: 94 },
      ]),
      TODAY
    );
    expect(erratic.eventCount).toBe(6);
    expect(erratic.gapSpread).toBeGreaterThan(0.6);
    expect(erratic.confidence).not.toBe('high');
  });

  it('never reports a cadence below one day', () => {
    const sameDay = analyseFamilyPattern(
      historyFrom(TODAY, [{ daysAgo: 0 }, { daysAgo: 0 }, { daysAgo: 0 }]),
      TODAY
    );

    expect(sameDay.hasPattern).toBe(true);
    expect(sameDay.cadenceDays).toBe(1);
    expect(sameDay.daysUntilExpected).toBe(1);
  });

  it('is deterministic: same history in, same pattern out', () => {
    const history = getMockHistory();
    expect(analyseFamilyPattern(history, TODAY)).toEqual(
      analyseFamilyPattern(history, TODAY)
    );
  });
});
