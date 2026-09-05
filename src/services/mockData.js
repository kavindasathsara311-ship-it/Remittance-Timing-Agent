/* =============================================================================
 * mockData.js — simulated backend that exactly matches the REST contract in
 * src/services/api.js. Everything here is deterministic (seeded) so the charts
 * and verdicts look natural but stay stable between reloads.
 *
 * Shapes returned:
 *   fxHistory      -> [{ date, rate }]
 *   recommendation -> { verdict, currentRate, avgRate7d, percentDiff, confidence }
 *   channels       -> [{ channel, effectiveRate, midMarketRate, feePercent, flagged }]
 *   coachMessage   -> { message, tone }
 *   conversation   -> [{ id, message, tone }]
 *   history        -> [{ id, date, amount, currency, senderCountry, channel, rate, received, status }]
 * ===========================================================================*/

export const CURRENCY_PAIRS = ['USD_LKR', 'SAR_LKR', 'AED_LKR', 'GBP_LKR'];
export const DEFAULT_PAIR = 'USD_LKR';

/* Rough mid-2026 anchor rates against the LKR + a per-pair trend "personality".
 * `targetPct` shapes the most recent week so the four tabs demonstrate a spread
 * of verdicts: USD good/high, SAR wait/high, AED neutral/low, GBP good/medium. */
const PAIR_PROFILES = {
  USD_LKR: { base: 302, drift: 0.62, amplitude: 1.8, period: 12, phase: 0.6, seed: 11, targetPct: 1.6 },
  SAR_LKR: { base: 82.5, drift: -0.02, amplitude: 0.5, period: 10, phase: 1.1, seed: 23, targetPct: -1.7 },
  AED_LKR: { base: 83.2, drift: 0.01, amplitude: 0.4, period: 11, phase: 2.0, seed: 37, targetPct: 0.15 },
  GBP_LKR: { base: 392, drift: 0.5, amplitude: 2.6, period: 13, phase: 0.2, seed: 51, targetPct: 0.9 },
};

/* Fee templates for known channels. `feePercent` drives effectiveRate and the
 * predatory flag (fee >= FLAG_THRESHOLD). */
const FLAG_THRESHOLD = 2.0;
const CHANNEL_TEMPLATES = [
  { channel: 'Wise', feePercent: 0.4, icon: 'public' },
  { channel: 'Instarem', feePercent: 0.7, icon: 'send' },
  { channel: 'Remitly', feePercent: 0.9, icon: 'account_balance_wallet' },
  { channel: 'WorldRemit', feePercent: 1.1, icon: 'payments' },
  { channel: 'Bank of Ceylon', feePercent: 1.2, icon: 'museum' },
  { channel: "People's Bank", feePercent: 1.35, icon: 'account_balance' },
  { channel: 'Sampath Bank', feePercent: 1.5, icon: 'account_balance' },
  { channel: 'HNB', feePercent: 1.8, icon: 'account_balance' },
  { channel: 'Western Union', feePercent: 2.1, icon: 'currency_exchange' },
  { channel: 'Commercial Bank', feePercent: 2.3, icon: 'account_balance' },
];

/* ------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* ------------------------------------------------------------------------- */

/** Small deterministic PRNG (mulberry32) so noise is stable per seed. */
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round(value, dp = 2) {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

function isoDateNDaysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/* ------------------------------------------------------------------------- */
/* FX history + recommendation                                                */
/* ------------------------------------------------------------------------- */

/**
 * GET /api/fx-history?pair=USD_LKR&days=30
 * @returns {{date:string, rate:number}[]} oldest -> newest
 */
export function getMockFxHistory(pair = DEFAULT_PAIR, days = 30) {
  const profile = PAIR_PROFILES[pair] || PAIR_PROFILES.USD_LKR;
  const rng = makeRng(profile.seed);
  const dp = profile.base > 200 ? 2 : 3;
  const series = [];

  for (let i = days - 1; i >= 0; i--) {
    const ageFromStart = days - 1 - i; // 0 at the oldest point
    const trend = profile.drift * ageFromStart;
    const wave = profile.amplitude * Math.sin(ageFromStart / profile.period + profile.phase);
    const noise = (rng() - 0.5) * profile.amplitude * 0.5;
    const rate = round(profile.base + trend + wave + noise, dp);
    series.push({ date: isoDateNDaysAgo(i), rate });
  }

  // Shape the most recent week so `current vs 7-day avg` lands on a target %
  // (that comparison is what drives the verdict). A zero-mean ramp keeps avg7
  // intact while moving the latest point — it reads as a natural recent move.
  if (typeof profile.targetPct === 'number' && days >= 7) {
    const last7 = series.slice(-7);
    const avg7 = last7.reduce((s, d) => s + d.rate, 0) / last7.length;
    const desiredCurrent = avg7 * (1 + profile.targetPct / 100);
    const m = (desiredCurrent - series[series.length - 1].rate) / 3;
    for (let k = 0; k < 7; k++) {
      const idx = series.length - 7 + k;
      series[idx].rate = round(series[idx].rate + m * (k - 3), dp);
    }
  }

  return series;
}

/**
 * GET /api/recommendation?pair=USD_LKR
 * Derived from the mock history so the numbers always agree with the chart.
 */
export function getMockRecommendation(pair = DEFAULT_PAIR, historyOverride) {
  const history = historyOverride !== undefined ? historyOverride : getMockFxHistory(pair, 30);
  
  if (!history || history.length === 0) {
    return { verdict: 'NEUTRAL', currentRate: 0, avgRate7d: 0, percentDiff: 0, confidence: 'low' };
  }
  
  const currentRate = history[history.length - 1].rate;
  const last7 = history.slice(-7).map((d) => d.rate);
  const avgRate7d = round(last7.reduce((s, r) => s + r, 0) / last7.length, 2);
  
  let percentDiff = 0;
  if (avgRate7d !== 0) {
    percentDiff = round(((currentRate - avgRate7d) / avgRate7d) * 100, 2);
  }

  let verdict = 'NEUTRAL';
  if (percentDiff >= 0.8) verdict = 'CONVERT_NOW';
  else if (percentDiff <= -0.8) verdict = 'WAIT';

  const abs = Math.abs(percentDiff);
  const confidence = abs >= 1.5 ? 'high' : abs >= 0.8 ? 'medium' : 'low';

  return { verdict, currentRate, avgRate7d, percentDiff, confidence };
}

/* ------------------------------------------------------------------------- */
/* Channels                                                                   */
/* ------------------------------------------------------------------------- */

/**
 * GET /api/channels?amount=500&pair=USD_LKR
 * Sorted best-first by effectiveRate. `flagged` marks high-fee (predatory)
 * channels. Also carries an `icon` + computed `receive` for the UI.
 */
export function getMockChannels(amount = 500, pair = DEFAULT_PAIR, templatesOverride) {
  const { currentRate } = getMockRecommendation(pair);
  const midMarketRate = currentRate;
  const templates = templatesOverride || CHANNEL_TEMPLATES;
  
  const safeAmount = Number(amount) || 0;

  return templates.map((tpl) => {
    // Tiny per-pair fee jitter so tabs feel independently sourced.
    const jitter = ((PAIR_PROFILES[pair]?.seed || 7) % 3) * 0.05;
    const baseFee = tpl.feePercent !== undefined ? tpl.feePercent : 0;
    const feePercent = round(baseFee + jitter, 2);
    const effectiveRate = round(midMarketRate * (1 - feePercent / 100), 2);
    return {
      channel: tpl.channel || 'Unknown',
      icon: tpl.icon || 'public',
      effectiveRate,
      midMarketRate,
      feePercent,
      flagged: feePercent >= FLAG_THRESHOLD,
      receive: round(safeAmount * effectiveRate, 2),
      gapFromMid: round(midMarketRate - effectiveRate, 2),
    };
  }).sort((a, b) => b.effectiveRate - a.effectiveRate);
}

/* ------------------------------------------------------------------------- */
/* Coach messages                                                             */
/* ------------------------------------------------------------------------- */

/**
 * GET /api/coach-message?scenario=good_time|bad_time|urgent|predatory_channel
 * Single headline message + tone. tone ∈ reassuring | calm | info | warning.
 */
const COACH_MESSAGES = {
  good_time: {
    message:
      'Rates are near a 30-day high today — a strong day to convert if the timing suits you.',
    tone: 'reassuring',
  },
  bad_time: {
    message:
      'Rates dipped about 2% below the weekly average — worth waiting a few days if you can.',
    tone: 'calm',
  },
  urgent: {
    message:
      'No stress — if you need it today, sending now is completely fine. Just pick the lowest-fee channel so more reaches your family.',
    tone: 'reassuring',
  },
  predatory_channel: {
    message:
      'Heads-up: Commercial Bank is charging about 2.3% in fees today. A fairer channel puts more money in your family’s hands.',
    tone: 'warning',
  },
  neutral: {
    message:
      'The rate is sitting close to its weekly average — no strong signal either way today. Convert if it suits you, or wait for a clearer move.',
    tone: 'info',
  },
};

export function getMockCoachMessage(scenario = 'good_time') {
  return COACH_MESSAGES[scenario] || COACH_MESSAGES.good_time;
}

/* Multi-turn demo conversations for the Coach/Chat view. These simulate the
 * agent proactively messaging the family — beyond the single-message endpoint,
 * so they live in mock only. */
const COACH_CONVERSATIONS = {
  good_time: [
    {
      id: 'g1',
      tone: 'reassuring',
      message:
        'Hi! I’ve been watching USD → LKR for you, and today the rate is close to a 30-day high.',
    },
    {
      id: 'g2',
      tone: 'reassuring',
      message:
        'If you convert today, your family gets roughly 5,000 LKR more than they would have last week.',
    },
    {
      id: 'g3',
      tone: 'info',
      message:
        'Wise is closest to the mid-market rate right now, so almost none of it is lost to fees.',
    },
  ],
  bad_time: [
    {
      id: 'b1',
      tone: 'calm',
      message: 'Rates dipped about 2% below the weekly average this morning.',
    },
    {
      id: 'b2',
      tone: 'calm',
      message:
        'If you don’t need the money urgently, it’s worth waiting a few days for it to climb back.',
    },
    {
      id: 'b3',
      tone: 'reassuring',
      message: 'I’ll keep an eye on it and let you know when it looks better. No rush.',
    },
  ],
  urgent: [
    {
      id: 'u1',
      tone: 'reassuring',
      message: 'I understand you need the money today — that’s completely okay.',
    },
    {
      id: 'u2',
      tone: 'calm',
      message:
        'The rate is a little below average right now, but sending when it’s urgent is the right call.',
    },
    {
      id: 'u3',
      tone: 'info',
      message:
        'Choose the channel with the lowest fee — that way more of it still reaches your family today.',
    },
  ],
  predatory_channel: [
    {
      id: 'p1',
      tone: 'info',
      message: 'Quick heads-up on fees before you send.',
    },
    {
      id: 'p2',
      tone: 'warning',
      message:
        'Commercial Bank is charging about 2.3% today. On 500 USD that’s close to 35 USD quietly taken off the top.',
    },
    {
      id: 'p3',
      tone: 'reassuring',
      message:
        'Remit App Y is much closer to the mid-market rate — you’d keep more of your own money.',
    },
  ],
};

/** Returns a full demo conversation for a scenario (mock-only helper). */
export function getMockConversation(scenario = 'good_time') {
  return COACH_CONVERSATIONS[scenario] || COACH_CONVERSATIONS.good_time;
}

/* ------------------------------------------------------------------------- */
/* History                                                                    */
/* ------------------------------------------------------------------------- */

const HISTORY_TEMPLATES = [
  { daysAgo: 6, amount: 500, currency: 'USD', senderCountry: 'United States', channel: 'Wise', rate: 322.4, status: 'Completed' },
  { daysAgo: 15, amount: 1200, currency: 'SAR', senderCountry: 'Saudi Arabia', channel: 'Bank of Ceylon', rate: 81.1, status: 'Completed' },
  { daysAgo: 24, amount: 800, currency: 'AED', senderCountry: 'UAE', channel: 'Remitly', rate: 82.9, status: 'Completed' },
  { daysAgo: 38, amount: 350, currency: 'GBP', senderCountry: 'United Kingdom', channel: 'Instarem', rate: 388.2, status: 'Completed' },
  { daysAgo: 47, amount: 600, currency: 'USD', senderCountry: 'United States', channel: 'Western Union', rate: 315.7, status: 'Completed' },
  { daysAgo: 59, amount: 1500, currency: 'SAR', senderCountry: 'Saudi Arabia', channel: 'Wise', rate: 80.6, status: 'Completed' },
  { daysAgo: 71, amount: 450, currency: 'AED', senderCountry: 'UAE', channel: "People's Bank", rate: 82.1, status: 'Completed' },
  { daysAgo: 84, amount: 900, currency: 'USD', senderCountry: 'United States', channel: 'Commercial Bank', rate: 309.3, status: 'Completed' },
];

/** Simulated past remittance events (History page). */
export function getMockHistory() {
  return HISTORY_TEMPLATES.map((row, i) => ({
    id: `h${i + 1}`,
    date: isoDateNDaysAgo(row.daysAgo),
    amount: row.amount,
    currency: row.currency,
    senderCountry: row.senderCountry,
    channel: row.channel,
    rate: row.rate,
    received: round(row.amount * row.rate, 2),
    status: row.status,
  }));
}
