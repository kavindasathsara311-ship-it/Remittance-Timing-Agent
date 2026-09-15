/* =============================================================================
 * api.js — the ONLY file that talks to data.
 * ===========================================================================*/

import {
  getMockFxHistory,
  getMockRecommendation,
  getMockChannels,
  getMockCoachMessage,
  getMockConversation,
  getMockHistory,
  DEFAULT_PAIR,
} from './mockData.js';

export { CURRENCY_PAIRS, DEFAULT_PAIR } from './mockData.js';

export const USE_MOCK_DATA = true;

const API_BASE =
  (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

function simulateLatency(min = 180, max = 420) {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
        
        const historyList = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : null);
        if (!historyList) {
          throw new Error('AllRatesToday returned invalid historical data shape.');
        }

        return historyList.map(item => ({
          date: item.date || item.timestamp,
          rate: Number(item.rate || item.value)
        }));
      } else {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Proxy responded with HTTP ${res.status}: ${errBody}`);
      }
    } catch (e) {
      console.error("AllRatesToday Proxy Error (getFxHistory):", e);
    }

    return getMockFxHistory(pair, days);
  }
  return request('/api/fx-history', { pair, days });
}

export async function getRecommendation(pair = DEFAULT_PAIR) {
  if (USE_MOCK_DATA) {
    await simulateLatency();

    try {
      const sourceCurrency = pair.split('_')[0];
      
      const currentRes = await fetch('/api/allrates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getRate', sourceCurrency, targetCurrency: 'LKR' })
      });
      
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

        const historyList = Array.isArray(historyData) ? historyData : (historyData && Array.isArray(historyData.data) ? historyData.data : null);

        if (!currentData || !historyList) {
          throw new Error('AllRatesToday returned an invalid data shape.');
        }

        const rateObj = Array.isArray(currentData) ? currentData[0] : currentData;
        const currentRate = typeof rateObj === 'number' ? rateObj : Number(rateObj.rate || rateObj.value);
        const rateTimestamp = rateObj?.time || currentJson?.timestamp || new Date().toISOString();
        const last7 = historyList.map(item => Number(item.rate || item.value));
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

        return { verdict, currentRate, avgRate7d, percentDiff, confidence, rateTimestamp };
      } else {
        const currentErr = !currentRes.ok ? await currentRes.text().catch(() => '') : '';
        const historyErr = !historyRes.ok ? await historyRes.text().catch(() => '') : '';
        throw new Error(`Proxy responded with error. currentRes HTTP ${currentRes.status}: ${currentErr} | historyRes HTTP ${historyRes.status}: ${historyErr}`);
      }
    } catch (e) {
      console.error("AllRatesToday Proxy Error (getRecommendation):", e);
    }

    return getMockRecommendation(pair);
  }
  return request('/api/recommendation', { pair });
}

export async function getChannels(amount = 500, pair = DEFAULT_PAIR) {
  let liveMidMarketRate;
  try {
    const rec = await getRecommendation(pair);
    if (rec && rec.currentRate) {
      liveMidMarketRate = rec.currentRate;
    }
  } catch (e) {}

  if (USE_MOCK_DATA) {
    await simulateLatency();
    return getMockChannels(amount, pair, undefined, liveMidMarketRate);
  }
  const data = await request('/api/channels', { amount, pair });
  return data.map((c) => ({
    ...c,
    receive: c.receive ?? round(amount * c.effectiveRate, 2),
    gapFromMid: c.gapFromMid ?? round(c.midMarketRate - c.effectiveRate, 2),
  }));
}

export async function getCoachMessage(scenario = 'good_time') {
  if (USE_MOCK_DATA) {
    await simulateLatency(120, 260);
    return getMockCoachMessage(scenario);
  }
  return request('/api/coach-message', { scenario });
}

export async function getConversation(scenario = 'good_time') {
  if (USE_MOCK_DATA) {
    await simulateLatency(120, 260);
    return getMockConversation(scenario);
  }
  const single = await getCoachMessage(scenario);
  return [{ id: `${scenario}-1`, message: single.message, tone: single.tone }];
}

let currentHistoryData = null;

export async function getHistory() {
  if (!currentHistoryData) {
    currentHistoryData = getMockHistory();
  }
  if (USE_MOCK_DATA) {
    await simulateLatency();
    return [...currentHistoryData];
  }
  return request('/api/history', {});
}

export async function addHistoryRecord(record) {
  if (!currentHistoryData) currentHistoryData = getMockHistory();
  const rate = Number(record.rate) || 300;
  const amount = Number(record.amount) || 0;
  const newRecord = {
    id: `h${Date.now()}`,
    date: record.date || new Date().toISOString().slice(0, 10),
    amount,
    currency: record.currency || 'USD',
    senderCountry: record.senderCountry || 'United States',
    channel: record.channel || 'Wise',
    rate,
    received: Math.round(amount * rate * 100) / 100,
    status: record.status || 'Completed',
  };
  currentHistoryData = [newRecord, ...currentHistoryData];
  return [...currentHistoryData];
}

export async function updateHistoryRecord(id, updates) {
  if (!currentHistoryData) currentHistoryData = getMockHistory();
  currentHistoryData = currentHistoryData.map((item) => {
    if (item.id === id) {
      const updated = { ...item, ...updates };
      const amount = Number(updated.amount);
      const rate = Number(updated.rate);
      updated.received = Math.round(amount * rate * 100) / 100;
      return updated;
    }
    return item;
  });
  return [...currentHistoryData];
}

export async function deleteHistoryRecord(id) {
  if (!currentHistoryData) currentHistoryData = getMockHistory();
  currentHistoryData = currentHistoryData.filter((item) => item.id !== id);
  return [...currentHistoryData];
}

export async function resetHistoryData() {
  currentHistoryData = getMockHistory();
  return [...currentHistoryData];
}

function round(value, dp = 2) {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}
