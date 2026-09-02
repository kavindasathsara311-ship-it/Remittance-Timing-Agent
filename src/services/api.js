/* =============================================================================
 * api.js — the ONLY file that talks to data.
 *
 *   ▸ Flip USE_MOCK_DATA to `false` to hit the real REST backend.
 *   ▸ Point it at the API by setting VITE_API_BASE_URL in a `.env` file
 *     (e.g. VITE_API_BASE_URL=http://localhost:3001). No other file changes.
 *
 * Every function returns the exact shape described in the backend contract, so
 * components never need to know whether they got mock or live data.
 * ===========================================================================*/

import {
  getMockFxHistory,
  getMockRecommendation,
  getMockChannels,
  getMockCoachMessage,
  getMockConversation,
  getMockHistory,
  DEFAULT_PAIR,
} from './mockData';

/* Re-exported so the UI imports pair constants from the service layer (one
 * place), not from the mock module directly. */
export { CURRENCY_PAIRS, DEFAULT_PAIR } from './mockData';

/* ── THE ONE-LINE SWITCH ─────────────────────────────────────────────────── */
export const USE_MOCK_DATA = true;
/* ─────────────────────────────────────────────────────────────────────────── */

const API_BASE =
  (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

/** Small delay so mock mode still exercises loading states realistically. */
function simulateLatency(min = 180, max = 420) {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Thin fetch wrapper with JSON parsing + error surface. */
async function request(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText} for ${path}`);
  }
  return res.json();
}

/**
 * GET /api/fx-history?pair=USD_LKR&days=30
 * @returns {Promise<{date:string, rate:number}[]>}
 */
export async function getFxHistory(pair = DEFAULT_PAIR, days = 30) {
  if (USE_MOCK_DATA) {
    await simulateLatency();
    return getMockFxHistory(pair, days);
  }
  return request('/api/fx-history', { pair, days });
}

/**
 * GET /api/recommendation?pair=USD_LKR
 * @returns {Promise<{verdict:'WAIT'|'CONVERT_NOW'|'NEUTRAL', currentRate:number,
 *   avgRate7d:number, percentDiff:number, confidence:'high'|'medium'|'low'}>}
 */
export async function getRecommendation(pair = DEFAULT_PAIR) {
  if (USE_MOCK_DATA) {
    await simulateLatency();
    return getMockRecommendation(pair);
  }
  return request('/api/recommendation', { pair });
}

/**
 * GET /api/channels?amount=500&pair=USD_LKR
 * @returns {Promise<Array<{channel:string, effectiveRate:number, midMarketRate:number,
 *   feePercent:number, flagged:boolean}>>}
 */
export async function getChannels(amount = 500, pair = DEFAULT_PAIR) {
  if (USE_MOCK_DATA) {
    await simulateLatency();
    return getMockChannels(amount, pair);
  }
  const data = await request('/api/channels', { amount, pair });
  // Live API may not include our UI-only helpers; derive them defensively.
  return data.map((c) => ({
    ...c,
    receive: c.receive ?? round(amount * c.effectiveRate, 2),
    gapFromMid: c.gapFromMid ?? round(c.midMarketRate - c.effectiveRate, 2),
  }));
}

/**
 * GET /api/coach-message?scenario=good_time|bad_time|urgent|predatory_channel
 * @returns {Promise<{message:string, tone:string}>}
 */
export async function getCoachMessage(scenario = 'good_time') {
  if (USE_MOCK_DATA) {
    await simulateLatency(120, 260);
    return getMockCoachMessage(scenario);
  }
  return request('/api/coach-message', { scenario });
}

/**
 * Multi-turn demo conversation for the Coach/Chat view.
 * NOTE: not part of the core REST contract — in live mode we fall back to the
 * single coach-message endpoint and present it as one bubble.
 * @returns {Promise<Array<{id:string, message:string, tone:string}>>}
 */
export async function getConversation(scenario = 'good_time') {
  if (USE_MOCK_DATA) {
    await simulateLatency(120, 260);
    return getMockConversation(scenario);
  }
  const single = await getCoachMessage(scenario);
  return [{ id: `${scenario}-1`, message: single.message, tone: single.tone }];
}

/**
 * Past remittance events for the History page.
 * NOTE: optional/nice-to-have — mock-only for now; wire to a real endpoint
 * (e.g. GET /api/history) when the backend provides one.
 */
export async function getHistory() {
  if (USE_MOCK_DATA) {
    await simulateLatency();
    return getMockHistory();
  }
  return request('/api/history', {});
}

/* ------------------------------------------------------------------------- */
function round(value, dp = 2) {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}
