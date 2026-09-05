import { describe, it, expect } from 'vitest';
import {
  NUDGE_POLICY,
  buildNudge,
  composeNudge,
  decideNudge,
  nudgeId,
} from './nudgeEngine';
import { analyseFamilyPattern, localTodayIso } from './familyPattern';

/* =============================================================================
 * nudgeEngine.test.js — feature #4: deciding WHEN to speak up.
 *
 * These tests are the spec for the agent's judgement. The interesting cases are
 * the ones where it says NOTHING: an agent that always speaks is a notification
 * feed, and families learn to ignore those.
 * ===========================================================================*/

/* ------------------------------------------------------------------------- */
/* Fixtures — the shape the real data produces                                */
/* ------------------------------------------------------------------------- */

function makePattern(overrides = {}) {
  return {
    hasPattern: true,
    eventCount: 8,
    confidence: 'high',
    cadenceDays: 12,
    cadenceLabel: 'fortnightly',
    gapSpread: 0.42,
    lastTransferDate: '2026-08-30',
    daysSinceLast: 6,
    nextExpectedDate: '2026-09-11',
    daysUntilExpected: 6,
    isOverdue: false,
    corridor: 'USD',
    pair: 'USD_LKR',
    typicalAmount: 600,
    usualChannel: 'Wise',
    senderCountry: 'United States',
    corridorShare: 0.38,
    ...overrides,
  };
}

function makeRecommendation(overrides = {}) {
  return {
    verdict: 'CONVERT_NOW',
    currentRate: 324,
    avgRate7d: 319,
    percentDiff: 1.6,
    confidence: 'high',
    ...overrides,
  };
}

/** Best-first, exactly as getChannels() returns it. */
function makeChannels() {
  return [
    { channel: 'Wise', effectiveRate: 322.4, midMarketRate: 324, feePercent: 0.5, flagged: false },
    { channel: 'Remitly', effectiveRate: 318.1, midMarketRate: 324, feePercent: 1.8, flagged: false },
    {
      channel: 'Western Union',
      effectiveRate: 314.2,
      midMarketRate: 324,
      feePercent: 2.6,
      flagged: true,
    },
  ];
}

const NOW = Date.parse('2026-09-05T09:00:00.000Z');
const hoursAgo = (h) => new Date(NOW - h * 3600000).toISOString();

/* ------------------------------------------------------------------------- */

describe('decideNudge — when the agent stays quiet', () => {
  it('is silent without a readable pattern (never sends a generic blast)', () => {
    const decision = decideNudge({
      pattern: { hasPattern: false, daysUntilExpected: 0 },
      recommendation: makeRecommendation(),
      channels: makeChannels(),
      now: NOW,
    });

    expect(decision.decision).toBe('silent');
    expect(decision.reason).toBe('insufficient_history');
  });

  it('is silent when there is no pattern at all', () => {
    expect(decideNudge({ now: NOW }).decision).toBe('silent');
  });

  it('holds while the rate context is still missing', () => {
    const decision = decideNudge({
      pattern: makePattern(),
      recommendation: null,
      channels: makeChannels(),
      now: NOW,
    });

    expect(decision.decision).toBe('hold');
    expect(decision.reason).toBe('no_clear_signal');
  });

  it('holds when the next transfer is outside the lead window', () => {
    const decision = decideNudge({
      pattern: makePattern({ daysUntilExpected: NUDGE_POLICY.LEAD_WINDOW_DAYS + 1 }),
      recommendation: makeRecommendation(),
      channels: makeChannels(),
      now: NOW,
    });

    expect(decision.decision).toBe('hold');
    expect(decision.reason).toBe('too_early');
    expect(decision.urgency).toBe('watch');
  });

  it('holds on a weak rate signal that is not worth interrupting for', () => {
    const decision = decideNudge({
      pattern: makePattern({ daysUntilExpected: 6 }),
      recommendation: makeRecommendation({ verdict: 'CONVERT_NOW', confidence: 'low' }),
      channels: makeChannels(),
      now: NOW,
    });

    expect(decision.decision).toBe('hold');
    expect(decision.reason).toBe('no_clear_signal');
  });

  it('holds on a neutral rate when the transfer is still days away', () => {
    const decision = decideNudge({
      pattern: makePattern({ daysUntilExpected: 6 }),
      recommendation: makeRecommendation({ verdict: 'NEUTRAL', confidence: 'medium' }),
      channels: makeChannels(),
      now: NOW,
    });

    expect(decision.decision).toBe('hold');
    expect(decision.reason).toBe('no_clear_signal');
  });
});

describe('decideNudge — when the agent speaks up', () => {
  it('speaks on a good rate inside the lead window', () => {
    const decision = decideNudge({
      pattern: makePattern(),
      recommendation: makeRecommendation(),
      channels: makeChannels(),
      now: NOW,
    });

    expect(decision).toMatchObject({
      decision: 'speak',
      reason: 'good_rate_before_transfer',
      tone: 'reassuring',
      urgency: 'soon',
    });
  });

  it('speaks calmly on a low rate, telling them they still have time', () => {
    const decision = decideNudge({
      pattern: makePattern(),
      recommendation: makeRecommendation({
        verdict: 'WAIT',
        percentDiff: -1.7,
        confidence: 'high',
      }),
      channels: makeChannels(),
      now: NOW,
    });

    expect(decision).toMatchObject({
      decision: 'speak',
      reason: 'low_rate_before_transfer',
      tone: 'calm',
    });
  });

  it('prioritises a concrete fee loss on their usual channel over the rate move', () => {
    const decision = decideNudge({
      pattern: makePattern({ usualChannel: 'Western Union' }),
      recommendation: makeRecommendation(),
      channels: makeChannels(),
      now: NOW,
    });

    expect(decision).toMatchObject({
      decision: 'speak',
      reason: 'usual_channel_overcharging',
      tone: 'warning',
    });
  });

  it('does NOT invent a fee problem when their usual channel is already the best', () => {
    const decision = decideNudge({
      pattern: makePattern({ usualChannel: 'Wise' }), // Wise is channels[0], unflagged
      recommendation: makeRecommendation(),
      channels: makeChannels(),
      now: NOW,
    });

    expect(decision.reason).toBe('good_rate_before_transfer');
  });

  it('does NOT flag a channel that is merely the usual one but not the cheapest', () => {
    const decision = decideNudge({
      pattern: makePattern({ usualChannel: 'Remitly' }), // second best, not flagged
      recommendation: makeRecommendation(),
      channels: makeChannels(),
      now: NOW,
    });

    expect(decision.reason).toBe('good_rate_before_transfer');
  });

  it('speaks when the transfer is due even if the rate is unremarkable', () => {
    const decision = decideNudge({
      pattern: makePattern({ daysUntilExpected: 0 }),
      recommendation: makeRecommendation({ verdict: 'NEUTRAL', confidence: 'low' }),
      channels: makeChannels(),
      now: NOW,
    });

    expect(decision).toMatchObject({
      decision: 'speak',
      reason: 'transfer_due',
      tone: 'info',
      urgency: 'now',
    });
  });

  it('speaks when the transfer is overdue', () => {
    const decision = decideNudge({
      pattern: makePattern({ daysUntilExpected: -4, isOverdue: true }),
      recommendation: makeRecommendation({ verdict: 'NEUTRAL', confidence: 'low' }),
      channels: makeChannels(),
      now: NOW,
    });

    expect(decision.reason).toBe('transfer_due');
    expect(decision.urgency).toBe('now');
  });

  it('escalates urgency as the expected date approaches', () => {
    const at = (days) =>
      decideNudge({
        pattern: makePattern({ daysUntilExpected: days }),
        recommendation: makeRecommendation(),
        channels: makeChannels(),
        now: NOW,
      }).urgency;

    expect(at(NUDGE_POLICY.URGENT_BY_DAYS)).toBe('now');
    expect(at(NUDGE_POLICY.URGENT_BY_DAYS + 1)).toBe('soon');
    expect(at(NUDGE_POLICY.LEAD_WINDOW_DAYS)).toBe('soon');
    expect(at(NUDGE_POLICY.LEAD_WINDOW_DAYS + 1)).toBe('watch');
  });
});

describe('decideNudge — dismissal and the anti-nag cooldown', () => {
  const speaking = {
    pattern: makePattern(),
    recommendation: makeRecommendation(),
    channels: makeChannels(),
    now: NOW,
  };

  it('gives every decision a stable id derived from reason + expected date', () => {
    const a = decideNudge(speaking);
    const b = decideNudge(speaking);

    expect(a.id).toBe(b.id);
    expect(a.id).toBe(nudgeId(a.reason, speaking.pattern));
    expect(a.id).toContain(speaking.pattern.nextExpectedDate);
  });

  it('honours a dismissal of this exact nudge', () => {
    const id = nudgeId('good_rate_before_transfer', speaking.pattern);
    const decision = decideNudge({ ...speaking, dismissedId: id });

    expect(decision.decision).toBe('hold');
    expect(decision.reason).toBe('dismissed');
    expect(decision.id).toBe(id);
  });

  it('still speaks about something different after a dismissal', () => {
    const dismissed = nudgeId('good_rate_before_transfer', makePattern());
    const decision = decideNudge({
      ...speaking,
      pattern: makePattern({ usualChannel: 'Western Union' }),
      dismissedId: dismissed,
    });

    expect(decision.decision).toBe('speak');
    expect(decision.reason).toBe('usual_channel_overcharging');
  });

  it('suppresses a DIFFERENT nudge inside the cooldown window', () => {
    const decision = decideNudge({
      ...speaking,
      deliveredId: 'nudge-something-else-2026-08-01',
      lastNudgeAt: hoursAgo(NUDGE_POLICY.COOLDOWN_HOURS - 1),
    });

    expect(decision.decision).toBe('hold');
    expect(decision.reason).toBe('cooldown');
  });

  it('keeps showing the nudge already on screen (no flicker mid-view)', () => {
    const id = nudgeId('good_rate_before_transfer', speaking.pattern);
    const decision = decideNudge({
      ...speaking,
      deliveredId: id,
      lastNudgeAt: hoursAgo(1), // well inside the cooldown
    });

    expect(decision.decision).toBe('speak');
    expect(decision.id).toBe(id);
  });

  it('lets a new nudge through once the cooldown has expired', () => {
    const decision = decideNudge({
      ...speaking,
      deliveredId: 'nudge-something-else-2026-08-01',
      lastNudgeAt: hoursAgo(NUDGE_POLICY.COOLDOWN_HOURS + 1),
    });

    expect(decision.decision).toBe('speak');
  });

  it('ignores a corrupt or missing delivery timestamp', () => {
    expect(
      decideNudge({ ...speaking, lastNudgeAt: 'not-a-date' }).decision
    ).toBe('speak');
    expect(decideNudge({ ...speaking, lastNudgeAt: undefined }).decision).toBe('speak');
  });
});

describe('composeNudge — turning a decision into words', () => {
  const input = {
    pattern: makePattern(),
    recommendation: makeRecommendation(),
    channels: makeChannels(),
  };

  it('produces a headline, three bubbles and the evidence chips when speaking', () => {
    const nudge = composeNudge(decideNudge({ ...input, now: NOW }), input);

    expect(nudge.decision).toBe('speak');
    expect(typeof nudge.headline).toBe('string');
    expect(nudge.headline.length).toBeGreaterThan(0);
    expect(nudge.messages).toHaveLength(3);
    expect(nudge.messages.every((m) => m.message && m.id && m.tone)).toBe(true);
    expect(nudge.quietMessage).toBeNull();

    // the personalised evidence must actually appear in the chips
    expect(nudge.meta.join(' ')).toContain('United States');
    expect(nudge.meta.join(' ')).toContain('USD');
    expect(nudge.meta.join(' ')).toContain('Wise');
    expect(nudge.meta.join(' ')).toContain('12');
  });

  it('interpolates the family pattern into the copy, not placeholders', () => {
    const nudge = composeNudge(decideNudge({ ...input, now: NOW }), input);
    const all = nudge.messages.map((m) => m.message).join(' ');

    expect(all).toContain('United States');
    expect(all).toContain('in about 6 days');
    expect(all).toContain('Rs '); // the concrete gain, in rupees
    expect(all).not.toMatch(/\{|\}|undefined|NaN/);
    expect(nudge.headline).not.toMatch(/\{|\}|undefined|NaN/);
  });

  it('names the USUAL channel in a fee warning, never the cheapest one', () => {
    const pattern = makePattern({ usualChannel: 'Western Union' });
    const nudge = composeNudge(decideNudge({ ...input, pattern, now: NOW }), {
      ...input,
      pattern,
    });

    expect(nudge.reason).toBe('usual_channel_overcharging');
    // the warning must point at the provider they actually use, with its fee
    expect(nudge.headline).toContain('Western Union');
    expect(nudge.headline).toContain('2.6%');
    expect(nudge.messages[0].message).toContain('Western Union');
    // ...and the cheaper alternative is offered as the alternative, in bubble 2
    expect(nudge.messages[1].message).toContain('Wise');
    expect(nudge.messages[1].message).not.toContain('Rs 0');
  });

  it('reads country names with the right article, and keeps the numbers honest', () => {
    const nudge = composeNudge(decideNudge({ ...input, now: NOW }), input);

    expect(nudge.context.country).toBe('the United States');
    expect(nudge.headline).toContain('from the United States');
    // 1.6% of the 7-day average on 600 USD == the rupee figure we quote
    expect(nudge.context.percent).toBe('1.6%');
    expect(nudge.context.gain).toBe('Rs 3,000');

    const qatar = makePattern({ senderCountry: 'Qatar' });
    expect(
      composeNudge(decideNudge({ ...input, pattern: qatar, now: NOW }), {
        ...input,
        pattern: qatar,
      }).context.country
    ).toBe('Qatar');
  });

  it('phrases an overdue transfer so the sentence still reads', () => {
    const pattern = makePattern({ daysUntilExpected: -3, isOverdue: true });
    const recommendation = makeRecommendation({ verdict: 'NEUTRAL', confidence: 'low' });
    const nudge = composeNudge(
      decideNudge({ ...input, pattern, recommendation, now: NOW }),
      { ...input, pattern, recommendation }
    );

    expect(nudge.reason).toBe('transfer_due');
    expect(nudge.context.when).toBe('any time now — it is about 3 days late');
    expect(nudge.messages[0].message).toContain('are due any time now');
    // "are due about 3 days late" would be nonsense — guard against it
    expect(nudge.messages[0].message).not.toContain('due about 3 days late');
  });

  it('maps tone to a semantic status key for colour', () => {
    const good = composeNudge(decideNudge({ ...input, now: NOW }), input);
    expect(good.status).toBe('good');

    const warn = composeNudge(
      decideNudge({ ...input, pattern: makePattern({ usualChannel: 'Western Union' }), now: NOW }),
      { ...input, pattern: makePattern({ usualChannel: 'Western Union' }) }
    );
    expect(warn.status).toBe('warn');
  });

  it('returns an explanation instead of bubbles when staying quiet', () => {
    const quiet = composeNudge(
      decideNudge({
        ...input,
        pattern: makePattern({ daysUntilExpected: 30 }),
        now: NOW,
      }),
      { ...input, pattern: makePattern({ daysUntilExpected: 30 }) }
    );

    expect(quiet.decision).toBe('hold');
    expect(quiet.reason).toBe('too_early');
    expect(quiet.messages).toEqual([]);
    expect(quiet.meta).toEqual([]);
    expect(quiet.headline).toBeNull();
    expect(typeof quiet.quietMessage).toBe('string');
    expect(quiet.quietMessage).toContain('in about 30 days');
  });

  it('has quiet copy for every silence reason', () => {
    for (const reason of [
      'insufficient_history',
      'too_early',
      'no_clear_signal',
      'cooldown',
      'dismissed',
    ]) {
      const composed = composeNudge(
        { decision: 'hold', reason, tone: 'info', urgency: 'watch' },
        input
      );
      expect(composed.quietMessage).toBeTruthy();
      expect(composed.messages).toEqual([]);
    }
  });
});

describe('buildNudge — the one-call convenience path', () => {
  it('decides and composes in a single call', () => {
    const nudge = buildNudge({
      pattern: makePattern(),
      recommendation: makeRecommendation(),
      channels: makeChannels(),
      now: NOW,
    });

    expect(nudge.decision).toBe('speak');
    expect(nudge.reason).toBe('good_rate_before_transfer');
    expect(nudge.messages.length).toBeGreaterThan(0);
  });

  it('never throws on empty input', () => {
    const nudge = buildNudge({});
    expect(nudge.decision).toBe('silent');
    expect(nudge.messages).toEqual([]);
    expect(typeof nudge.quietMessage).toBe('string');
  });
});

describe('the engine against the real demo data', () => {
  it('speaks up for the seeded family history', () => {
    const today = localTodayIso();

    const history = [
      { date: shift(today, -6), amount: 500, currency: 'USD', senderCountry: 'United States', channel: 'Wise' },
      { date: shift(today, -15), amount: 1200, currency: 'SAR', senderCountry: 'Saudi Arabia', channel: 'Bank of Ceylon' },
      { date: shift(today, -24), amount: 800, currency: 'AED', senderCountry: 'UAE', channel: 'Remitly' },
      { date: shift(today, -38), amount: 350, currency: 'GBP', senderCountry: 'United Kingdom', channel: 'Instarem' },
      { date: shift(today, -47), amount: 600, currency: 'USD', senderCountry: 'United States', channel: 'Western Union' },
      { date: shift(today, -59), amount: 1500, currency: 'SAR', senderCountry: 'Saudi Arabia', channel: 'Wise' },
      { date: shift(today, -71), amount: 450, currency: 'AED', senderCountry: 'UAE', channel: "People's Bank" },
      { date: shift(today, -84), amount: 900, currency: 'USD', senderCountry: 'United States', channel: 'Commercial Bank' },
    ];

    const pattern = analyseFamilyPattern(history, today);
    expect(pattern.daysUntilExpected).toBe(6);
    expect(pattern.daysUntilExpected).toBeLessThanOrEqual(NUDGE_POLICY.LEAD_WINDOW_DAYS);

    const nudge = buildNudge({
      pattern,
      recommendation: makeRecommendation(),
      channels: makeChannels(),
      now: NOW,
    });

    expect(nudge.decision).toBe('speak');
    expect(nudge.context.country).toBe('the United States');
    expect(nudge.context.amount).toBe('600');
    expect(nudge.context.cadenceDays).toBe(12);
    expect(nudge.headline).toContain('United States');
  });
});

/** Date arithmetic helper for the fixture above. */
function shift(iso, days) {
  const stamp = Date.parse(`${iso}T12:00:00Z`) + days * 86400000;
  return new Date(stamp).toISOString().slice(0, 10);
}
