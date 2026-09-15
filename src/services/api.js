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

// We removed the client-side AllRatesToday initialization here to prevent CORS errors.
// Live FX calls are now routed through the secure /api/allrates backend proxy.

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

    try {
      const sourceCurrency = pair.split('_')[0];
      const res = await fetch('/api/allrates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getHistoricalRates',
          sourceCurrency,
          targetCurrency: 'LKR',
          period: `${days}d`
        })
      });
      
      if (res.ok) {
        const { data } = await res.json();
        if (!Array.isArray(data)) {
          throw new Error('AllRatesToday returned an invalid data shape (likely missing/invalid API key).');
        }
        return data.map(item => ({
          date: item.date || item.timestamp,
          rate: Number(item.rate || item.value)
        }));
      } else {
        throw new Error(`Proxy responded with ${res.status}`);
      }
    } catch (e) {
      console.error("AllRatesToday Proxy Error (getFxHistory):", e);
      // Fall back to mock data
    }

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

    try {
      const sourceCurrency = pair.split('_')[0];
      
      // Fetch current rate
      const currentRes = await fetch('/api/allrates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getRate', sourceCurrency, targetCurrency: 'LKR' })
      });
      
      // Fetch 7-day history
      const historyRes = await fetch('/api/allrates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getHistoricalRates', sourceCurrency, targetCurrency: 'LKR', period: '7d' })
      });

      if (currentRes.ok && historyRes.ok) {
        const currentJson = await currentRes.json();
        const historyJson = await historyRes.json();
        
        const currentData = currentJson.data;
        const historyData = historyJson.data;

        // Ensure we actually got the numeric rate and the array of history
        if (!currentData || !Array.isArray(historyData)) {
          throw new Error('AllRatesToday returned an invalid data shape (likely missing/invalid API key).');
        }

        const currentRate = typeof currentData === 'number' ? currentData : Number(currentData.rate || currentData.value);
        const last7 = historyData.map(item => Number(item.rate || item.value));
        const avgRate7d = Math.round((last7.reduce((s, r) => s + r, 0) / last7.length) * 100) / 100;

        let percentDiff = 0;
        if (avgRate7d !== 0) {
          percentDiff = Math.round(((currentRate - avgRate7d) / avgRate7d) * 10000) / 100;
        }

        let verdict = 'NEUTRAL';
        if (percentDiff >= 0.8) verdict = 'CONVERT_NOW';
        else if (percentDiff <= -0.8) verdict = 'WAIT';

        const abs = Math.abs(percentDiff);
        const confidence = abs >= 1.5 ? 'high' : abs >= 0.8 ? 'medium' : 'low';

        return { verdict, currentRate, avgRate7d, percentDiff, confidence };
      }
    } catch (e) {
      console.error("AllRatesToday Proxy Error (getRecommendation):", e);
      // Fall back to mock data
    }

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
  const sourceCurrency = pair.split('_')[0];
  const safeAmount = Number(amount) || 500;

  try {
    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: safeAmount, pair, sourceCurrency, targetCurrency: 'LKR' }),
    });

    if (res.ok) {
      const json = await res.json();
      const channels = json.data?.channels || json.channels;
      if (Array.isArray(channels)) {
        return channels.map((c) => ({
          ...c,
          receive: c.receive ?? round(safeAmount * c.effectiveRate, 2),
          gapFromMid: c.gapFromMid ?? round(c.midMarketRate - c.effectiveRate, 2),
        }));
      }
    }
  } catch (e) {
    console.warn('Live API /api/channels proxy call failed, using fallback:', e);
  }

  if (USE_MOCK_DATA) {
    await simulateLatency();
    return getMockChannels(amount, pair);
  }
  const data = await request('/api/channels', { amount, pair });
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

const HISTORY_STORAGE_KEY = 'remittance_history_v1';
let inMemoryHistoryStore = null;

function readStoredHistory() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) {
        const seeded = getMockHistory();
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : getMockHistory();
    }
  } catch {
    /* ignore */
  }
  if (!inMemoryHistoryStore) {
    inMemoryHistoryStore = getMockHistory();
  }
  return inMemoryHistoryStore;
}

function writeStoredHistory(history) {
  inMemoryHistoryStore = history;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('remittance-history-updated', { detail: history }));
    }
  } catch (e) {
    console.error('Failed to write history to localStorage', e);
  }
}

/**
 * Past remittance events for the History page.
 * Uses localStorage persistence seeded with mock data.
 */
export async function getHistory() {
  if (USE_MOCK_DATA) {
    await simulateLatency();
    return readStoredHistory();
  }
  try {
    const data = await request('/api/history', {});
    return Array.isArray(data) ? data : readStoredHistory();
  } catch (e) {
    console.error('API getHistory error, falling back to local storage:', e);
    return readStoredHistory();
  }
}

export async function addHistoryRecord(record) {
  const history = readStoredHistory();
  const newRecord = {
    id: `h_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    date: record.date || new Date().toISOString().slice(0, 10),
    amount: Number(record.amount) || 0,
    currency: record.currency || 'USD',
    senderCountry: record.senderCountry || 'United States',
    channel: record.channel || 'Wise',
    rate: Number(record.rate) || 0,
    received: Number(record.received) || round((Number(record.amount) || 0) * (Number(record.rate) || 0), 2),
    status: record.status || 'Completed',
  };
  const updated = [newRecord, ...history];
  writeStoredHistory(updated);
  return updated;
}

export async function updateHistoryRecord(id, updatedFields) {
  const history = readStoredHistory();
  const updated = history.map((item) => {
    if (item.id === id) {
      const amount = updatedFields.amount !== undefined ? Number(updatedFields.amount) : item.amount;
      const rate = updatedFields.rate !== undefined ? Number(updatedFields.rate) : item.rate;
      const received = updatedFields.received !== undefined 
        ? Number(updatedFields.received) 
        : round(amount * rate, 2);
      return {
        ...item,
        ...updatedFields,
        amount,
        rate,
        received,
      };
    }
    return item;
  });
  writeStoredHistory(updated);
  return updated;
}

export async function deleteHistoryRecord(id) {
  const history = readStoredHistory();
  const updated = history.filter((item) => item.id !== id);
  writeStoredHistory(updated);
  return updated;
}

export async function resetHistoryData() {
  const seeded = getMockHistory();
  writeStoredHistory(seeded);
  return seeded;
}

/* ------------------------------------------------------------------------- */
function round(value, dp = 2) {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}
