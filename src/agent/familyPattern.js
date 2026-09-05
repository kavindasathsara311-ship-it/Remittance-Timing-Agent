/* =============================================================================
 * familyPattern.js — feature #3: "this family's pattern".
 *
 * Turns the raw remittance history into the handful of facts the agent needs
 * in order to personalise a nudge:
 *
 *   • cadence        — how often money arrives (median gap, outlier-resistant)
 *   • next expected  — when the NEXT transfer is likely, and how far off it is
 *   • corridor       — which country/currency this family actually depends on
 *   • usual amount   — the typical size of that corridor's transfers
 *   • usual channel  — the provider they keep going back to (fee-risk signal)
 *   • confidence     — how much the agent should trust its own prediction
 *
 * Pure and deterministic: same history in, same pattern out. No fetching, no
 * React, no user-facing copy — src/agent/nudgeEngine.js owns the words.
 * ===========================================================================*/

/** Fewer events than this and a median gap is meaningless, so we stay silent. */
export const MIN_EVENTS_FOR_PATTERN = 3;

const MS_PER_DAY = 86400000;

/* ------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* ------------------------------------------------------------------------- */

/* Dates are handled as whole-day indices from the epoch, parsed at UTC
 * MIDNIGHT and floored. Doing it this way means a DST change or a local
 * timezone offset can never shift a transfer by a day and quietly corrupt the
 * cadence — and, unlike parsing at noon and rounding, `toDayIndex` and
 * `isoFromDayIndex` stay exact inverses of each other. */

/** "2026-08-01" -> integer day index (or null when unparseable). */
export function toDayIndex(iso) {
  if (!iso) return null;
  const stamp = Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(stamp)) return null;
  return Math.floor(stamp / MS_PER_DAY);
}

/** Inverse of toDayIndex -> "YYYY-MM-DD". */
export function isoFromDayIndex(dayIndex) {
  return new Date(dayIndex * MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * Today's LOCAL calendar date as "YYYY-MM-DD", built field by field. Going via
 * toISOString() instead would roll back a day for anyone east of UTC in the
 * early hours — exactly when a "your transfer is due" nudge matters most.
 */
export function localTodayIso() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Today as a day index. `todayIso` is injectable so tests stay deterministic. */
export function todayIndex(todayIso) {
  if (todayIso) {
    const idx = toDayIndex(todayIso);
    if (idx !== null) return idx;
  }
  return toDayIndex(localTodayIso());
}

/* ------------------------------------------------------------------------- */
/* Statistics helpers                                                         */
/* ------------------------------------------------------------------------- */

/** Median — chosen over mean so one odd 60-day gap can't skew the cadence. */
export function median(numbers) {
  const clean = (Array.isArray(numbers) ? numbers : [])
    .map(Number)
    .filter((n) => Number.isFinite(n));
  if (!clean.length) return 0;
  const sorted = [...clean].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Most frequent value of `keyFn`, ties broken by the MOST RECENT occurrence.
 * Scanning newest-first and only replacing on a strictly greater count is what
 * makes the newest of several equally-common values win.
 */
function mostRecentMode(items, keyFn) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  if (!counts.size) return null;

  let best = null;
  for (let i = items.length - 1; i >= 0; i--) {
    const key = keyFn(items[i]);
    if (!key) continue;
    const count = counts.get(key);
    if (!best || count > best.count) best = { key, count };
  }
  return best ? best.key : null;
}

/** Human bucket for the cadence, used only for a subtle context chip. */
export function cadenceLabel(days) {
  if (!days || days < 1) return 'irregular';
  if (days <= 8) return 'weekly';
  if (days <= 17) return 'fortnightly';
  if (days <= 40) return 'monthly';
  return 'irregular';
}

/* ------------------------------------------------------------------------- */
/* Main analysis                                                              */
/* ------------------------------------------------------------------------- */

const EMPTY_PATTERN = {
  hasPattern: false,
  eventCount: 0,
  confidence: 'low',
  cadenceDays: 0,
  cadenceLabel: 'irregular',
  gapSpread: 0,
  lastTransferDate: null,
  daysSinceLast: 0,
  nextExpectedDate: null,
  daysUntilExpected: 0,
  isOverdue: false,
  corridor: null,
  pair: null,
  typicalAmount: 0,
  usualChannel: null,
  senderCountry: null,
  corridorShare: 0,
};

/**
 * @param {Array<{date:string, amount?:number, currency?:string,
 *   senderCountry?:string, channel?:string}>} history
 * @param {string} [todayIso] injectable "today" — keeps tests deterministic
 * @returns {object} pattern (see EMPTY_PATTERN for the full shape)
 */
export function analyseFamilyPattern(history, todayIso) {
  const events = (Array.isArray(history) ? history : [])
    .map((row) => ({ ...row, _day: toDayIndex(row?.date) }))
    .filter((row) => row._day !== null)
    .sort((a, b) => a._day - b._day); // oldest -> newest

  if (events.length < MIN_EVENTS_FOR_PATTERN) {
    return { ...EMPTY_PATTERN, eventCount: events.length };
  }

  const today = todayIndex(todayIso);

  /* ── Cadence + next expected transfer ─────────────────────────────────── */
  const gaps = [];
  for (let i = 1; i < events.length; i++) {
    gaps.push(events[i]._day - events[i - 1]._day);
  }
  const cadenceDays = Math.max(1, Math.round(median(gaps)));

  const last = events[events.length - 1];
  const daysSinceLast = today - last._day;
  const daysUntilExpected = cadenceDays - daysSinceLast;
  const nextExpectedDate = isoFromDayIndex(last._day + cadenceDays);

  /* Spread relative to the cadence: 0 = metronome, >1 = erratic. Used to
   * downgrade confidence so the agent doesn't over-promise on messy data. */
  const gapSpread = cadenceDays
    ? (Math.max(...gaps) - Math.min(...gaps)) / cadenceDays
    : 1;

  /* ── Dominant corridor (which country this family really depends on) ──── */
  const byCurrency = new Map();
  for (const event of events) {
    const key = event.currency || 'USD';
    if (!byCurrency.has(key)) byCurrency.set(key, []);
    byCurrency.get(key).push(event);
  }

  let dominant = null;
  for (const [currency, list] of byCurrency) {
    const lastDay = list[list.length - 1]._day;
    const beats =
      !dominant ||
      list.length > dominant.list.length ||
      (list.length === dominant.list.length && lastDay > dominant.lastDay);
    if (beats) dominant = { currency, list, lastDay };
  }

  const corridorEvents = dominant.list;
  const typicalAmount = median(corridorEvents.map((e) => Number(e.amount) || 0));

  /* ── Confidence ───────────────────────────────────────────────────────── */
  let confidence = 'low';
  if (events.length >= 6 && gapSpread <= 0.6) confidence = 'high';
  else if (events.length >= 4) confidence = 'medium';

  return {
    hasPattern: true,
    eventCount: events.length,
    confidence,
    cadenceDays,
    cadenceLabel: cadenceLabel(cadenceDays),
    gapSpread: Math.round(gapSpread * 100) / 100,
    lastTransferDate: isoFromDayIndex(last._day),
    daysSinceLast,
    nextExpectedDate,
    daysUntilExpected,
    isOverdue: daysUntilExpected <= 0,
    corridor: dominant.currency,
    pair: `${dominant.currency}_LKR`,
    typicalAmount,
    usualChannel: mostRecentMode(corridorEvents, (e) => e.channel),
    senderCountry:
      corridorEvents[corridorEvents.length - 1].senderCountry || null,
    corridorShare: Math.round((corridorEvents.length / events.length) * 100) / 100,
  };
}

export default analyseFamilyPattern;
