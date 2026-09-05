import { t } from '../i18n/strings';
import { formatMoney, formatPercent, formatRate, parsePair } from '../utils/format';
import { toneToStatus } from '../utils/verdict';

/* =============================================================================
 * nudgeEngine.js — feature #4: proactive, personalised nudging.
 *
 * This is the piece that makes the product an AGENT rather than a dashboard:
 * it decides WHEN to speak up, not just what to say. Silence is a first-class
 * outcome here — a nudge that fires every day teaches families to ignore it.
 *
 * It combines:
 *   #1 current rate context  -> recommendation (verdict, %diff, confidence)
 *   #3 this family's pattern -> cadence, next expected date, usual channel
 * into one personalised, timely recommendation.
 *
 * Two layers, deliberately separate:
 *   decideNudge()   pure policy. No strings, no formatting. Fully unit-testable.
 *   composeNudge()  turns a decision into formatted, translatable copy.
 * ===========================================================================*/

/** Tunable policy. Change behaviour here, never inside the rules below. */
export const NUDGE_POLICY = {
  /** How many days ahead of the expected transfer the agent may speak up. */
  LEAD_WINDOW_DAYS: 10,
  /** Don't repeat a nudge within this many hours — anti-nag cooldown. */
  COOLDOWN_HOURS: 20,
  /** Inside this many days the nudge is marked urgent. */
  URGENT_BY_DAYS: 2,
};

/* Tone per bubble, index-aligned with t.nudge.bubbles[reason]. Kept here (not
 * in strings.js) because tone drives COLOUR, and copy must stay copy-only. */
const BUBBLE_TONES = {
  good_rate_before_transfer: ['info', 'reassuring', 'reassuring'],
  low_rate_before_transfer: ['info', 'calm', 'calm'],
  usual_channel_overcharging: ['warning', 'info', 'reassuring'],
  transfer_due: ['info', 'info', 'reassuring'],
};

/* ------------------------------------------------------------------------- */
/* Layer 1 — the decision (pure policy, no copy)                              */
/* ------------------------------------------------------------------------- */

function result(decision, reason, tone, extra = {}) {
  return { decision, reason, tone, ...extra };
}

function urgencyFor(daysUntilExpected) {
  if (daysUntilExpected <= NUDGE_POLICY.URGENT_BY_DAYS) return 'now';
  if (daysUntilExpected <= NUDGE_POLICY.LEAD_WINDOW_DAYS) return 'soon';
  return 'watch';
}

function withinCooldown({ lastNudgeAt, now }) {
  if (!lastNudgeAt) return false;
  const hours = (now - new Date(lastNudgeAt).getTime()) / 3600000;
  return Number.isFinite(hours) && hours < NUDGE_POLICY.COOLDOWN_HOURS;
}

/**
 * The rules, in priority order. Returns a decision WITHOUT any user-facing
 * text so it can be asserted on directly in tests.
 */
function evaluate({ pattern, recommendation, channels }) {
  const urgency = urgencyFor(pattern?.daysUntilExpected ?? 999);

  /* 1. No readable pattern -> we cannot personalise, so we must not guess.
   *    A generic "rates are up!" blast is exactly what this isn't. */
  if (!pattern?.hasPattern) {
    return result('silent', 'insufficient_history', 'info', { urgency: 'watch' });
  }

  /* 2. Rate context still loading (or unavailable) -> nothing to say yet. */
  if (!recommendation) {
    return result('hold', 'no_clear_signal', 'info', { urgency });
  }

  const daysUntil = pattern.daysUntilExpected;

  /* 3. Outside the lead window. Speaking now would be noise: the family has
   *    no decision to make for another couple of weeks. */
  if (daysUntil > NUDGE_POLICY.LEAD_WINDOW_DAYS) {
    return result('hold', 'too_early', 'info', { urgency: 'watch' });
  }

  /* ── Inside the window: is there something genuinely worth saying? ─────── */
  const bestChannel = Array.isArray(channels) && channels.length ? channels[0] : null;
  const usualChannel =
    bestChannel && pattern.usualChannel
      ? channels.find((c) => c.channel === pattern.usualChannel) || null
      : null;

  /* A concrete, personalised loss beats an abstract rate move — but only when
   * switching would actually help (their usual channel isn't already the best
   * available), otherwise we'd be inventing a problem. */
  const channelIsWorseThanBest =
    !!usualChannel?.flagged && !!bestChannel && usualChannel.channel !== bestChannel.channel;

  if (channelIsWorseThanBest) {
    return result('speak', 'usual_channel_overcharging', 'warning', { urgency });
  }

  /* A meaningful rate signal while a transfer is approaching is the classic
   * nudge. `confidence === 'low'` means the move is under the 0.8% threshold,
   * which isn't worth interrupting anyone over. */
  const strongSignal = recommendation.confidence !== 'low';

  if (recommendation.verdict === 'CONVERT_NOW' && strongSignal) {
    return result('speak', 'good_rate_before_transfer', 'reassuring', { urgency });
  }

  if (recommendation.verdict === 'WAIT' && strongSignal) {
    return result('speak', 'low_rate_before_transfer', 'calm', { urgency });
  }

  /* Rate is unremarkable, but the transfer is due now/overdue — they need a
   * nudge to act regardless of timing, so we speak in a neutral tone. */
  if (daysUntil <= 1) {
    return result('speak', 'transfer_due', 'info', { urgency: 'now' });
  }

  /* 4. Inside the window, nothing worth saying. Staying quiet IS the decision. */
  return result('hold', 'no_clear_signal', 'info', { urgency });
}

/**
 * Stable identity for a nudge: same reason + same expected-transfer date = the
 * same nudge. Used for dismiss/cooldown bookkeeping and to key the chat effect
 * so it can't replay on every render.
 */
export function nudgeId(reason, pattern) {
  return `nudge-${reason}-${pattern?.nextExpectedDate || 'none'}`;
}

/**
 * Decide whether the agent should speak up right now.
 *
 * @param {object} input
 * @param {object} input.pattern          from analyseFamilyPattern()
 * @param {object} [input.recommendation] from getRecommendation()
 * @param {object[]} [input.channels]     from getChannels(), best-first
 * @param {string} [input.lastNudgeAt]    ISO timestamp of the previous nudge
 * @param {string} [input.deliveredId]    id of the nudge already on screen
 * @param {string} [input.dismissedId]    id the family explicitly dismissed
 * @param {number} [input.now]            epoch ms (injectable for tests)
 * @returns {{decision:'speak'|'hold'|'silent', reason:string, tone:string,
 *   urgency:string, id:string}}
 */
export function decideNudge(input = {}) {
  const { pattern, dismissedId, deliveredId, lastNudgeAt, now = Date.now() } = input;
  const base = evaluate(input);
  const id = nudgeId(base.reason, pattern);

  /* Respect an explicit dismissal of THIS nudge. A different, newer nudge is
   * still allowed through — dismissing one shouldn't mute the agent forever. */
  if (base.decision === 'speak' && dismissedId && dismissedId === id) {
    return result('hold', 'dismissed', base.tone, { urgency: 'watch', id });
  }

  /* Anti-nag: suppress a DIFFERENT nudge inside the cooldown window. The one
   * already on screen keeps showing, so the card never flickers away mid-view. */
  if (base.decision === 'speak' && deliveredId !== id && withinCooldown({ lastNudgeAt, now })) {
    return result('hold', 'cooldown', base.tone, { urgency: 'watch', id });
  }

  return { ...base, id };
}

/* ------------------------------------------------------------------------- */
/* Layer 2 — composing the copy                                               */
/* ------------------------------------------------------------------------- */

const lkr = (value) => `Rs ${formatMoney(Math.abs(Math.round(Number(value) || 0)))}`;

/** "in about 6 days" / "around today" / "any time now — it is 2 days late". */
function describeWhen(daysUntilExpected) {
  if (!Number.isFinite(daysUntilExpected)) return t.nudge.aroundToday;
  if (daysUntilExpected >= 1) return t.nudge.inDays(daysUntilExpected);
  if (daysUntilExpected === 0) return t.nudge.aroundToday;
  return t.nudge.overdue(Math.abs(daysUntilExpected));
}

/** Everything the templates interpolate, already formatted. */
function buildContext({ pattern, recommendation, channels }) {
  const { base } = parsePair(pattern?.pair || 'USD_LKR');
  const best = Array.isArray(channels) && channels.length ? channels[0] : null;
  const usual = channels?.find((c) => c.channel === pattern?.usualChannel) || null;
  const amount = Number(pattern?.typicalAmount) || 0;

  const rateDelta = recommendation ? recommendation.currentRate - recommendation.avgRate7d : 0;
  const channelDelta = best && usual ? best.effectiveRate - usual.effectiveRate : 0;

  const diffLabel = !recommendation
    ? t.dashboard.onAverage
    : recommendation.percentDiff >= 0.5
      ? t.dashboard.aboveAverage(formatPercent(recommendation.percentDiff))
      : recommendation.percentDiff <= -0.5
        ? t.dashboard.belowAverage(formatPercent(recommendation.percentDiff))
        : t.dashboard.onAverage;

  return {
    country: t.nudge.country(pattern?.senderCountry || base),
    currency: pattern?.corridor || base,
    amount: formatMoney(amount),
    cadenceDays: pattern?.cadenceDays || 0,
    when: describeWhen(pattern?.daysUntilExpected),
    daysLeft: t.nudge.daysWord(Math.max(0, pattern?.daysUntilExpected ?? 0)),
    /* One decimal place here, not the dashboard's zero: this number sits next to
     * a rupee figure the family can check, so "2%" against "Rs 3,060" would look
     * like the maths doesn't add up. */
    percent: formatPercent(recommendation?.percentDiff ?? 0, 1),
    gain: lkr(amount * rateDelta),
    loss: lkr(amount * channelDelta),
    channel: best?.channel || '—',
    bestChannel: best?.channel || '—',
    usualChannel: usual?.channel || pattern?.usualChannel || '—',
    fee: formatPercent(usual?.feePercent ?? 0, 1),
    rateLine: t.dashboard.rateLine(base, formatRate(recommendation?.currentRate)),
    diffLabel,
  };
}

/**
 * Turn a decision into ready-to-render copy: a headline, the agent-initiated
 * chat bubbles, and the context chips. Safe to call for any decision — quiet
 * ones come back with `quietMessage` instead of bubbles.
 */
export function composeNudge(decision, { pattern, recommendation, channels } = {}) {
  const context = buildContext({ pattern, recommendation, channels });
  const status = toneToStatus(decision.tone);

  /* decideNudge already stamped a stable id; fall back for hand-built decision
   * objects (tests) so composeNudge stays usable on its own. */
  const id = decision.id || nudgeId(decision.reason, pattern);

  if (decision.decision !== 'speak') {
    const quietCopy = t.nudge.quiet[decision.reason] || t.nudge.quiet.no_clear_signal;
    return {
      id,
      ...decision,
      status,
      context,
      headline: null,
      messages: [],
      meta: [],
      quietMessage: typeof quietCopy === 'function' ? quietCopy(context) : quietCopy,
    };
  }

  const templates = t.nudge.bubbles[decision.reason] || [];
  const tones = BUBBLE_TONES[decision.reason] || [];

  const messages = templates.map((makeMessage, i) => ({
    id: `${id}-m${i + 1}`,
    tone: tones[i] || decision.tone,
    message: makeMessage(context),
  }));

  const meta = [
    t.nudge.nextExpected(context.when),
    t.nudge.usualCorridor({
      amount: context.amount,
      currency: context.currency,
      country: context.country,
    }),
  ];
  if (pattern?.usualChannel) meta.push(t.nudge.usualChannel(pattern.usualChannel));
  if (pattern?.cadenceDays) meta.push(t.nudge.cadenceEvery(pattern.cadenceDays));

  return {
    id,
    ...decision,
    status,
    context,
    headline: t.nudge.headline[decision.reason](context),
    messages,
    meta,
    quietMessage: null,
  };
}

/** Convenience: decide + compose in one call. */
export function buildNudge(input = {}) {
  const { pattern, recommendation, channels } = input;
  const decision = decideNudge(input);
  return composeNudge(decision, { pattern, recommendation, channels });
}

export default buildNudge;
