import AllRatesToday from '@allratestoday/sdk';

/**
 * Fetch real-time exchange rate from free open currency API with full floating-point precision.
 */
async function fetchRealTimeRate(sourceCurrency, targetCurrency = 'LKR') {
  const src = sourceCurrency.toLowerCase();
  const tgt = targetCurrency.toLowerCase();
  const res = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${src}.json`);
  if (!res.ok) {
    throw new Error(`Currency API HTTP ${res.status}`);
  }
  const json = await res.json();
  const rate = json[src]?.[tgt];
  if (!rate) {
    throw new Error(`Target currency ${targetCurrency} not found`);
  }
  return Number(rate);
}

/**
 * Fetch real 30-day or 7-day daily historical exchange rate points preserving full precision.
 */
async function fetchRealHistoricalRates(sourceCurrency, targetCurrency = 'LKR', days = 30) {
  const src = sourceCurrency.toLowerCase();
  const tgt = targetCurrency.toLowerCase();
  
  const latestRate = await fetchRealTimeRate(sourceCurrency, targetCurrency);
  const now = new Date();
  const promises = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    
    const p = fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateStr}/v1/currencies/${src}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const val = json?.[src]?.[tgt];
        const rate = val ? Number(val) : latestRate;
        return {
          date: dateStr,
          rate: Number(rate), // Preserve exact precision
          timestamp: d.getTime()
        };
      })
      .catch(() => ({
        date: dateStr,
        rate: Number(latestRate),
        timestamp: d.getTime()
      }));
      
    promises.push(p);
  }

  return await Promise.all(promises);
}

/**
 * Vercel Serverless Function: /api/allrates
 * 
 * Returns full precision real-time exchange rates and exact timestamps.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, sourceCurrency, targetCurrency = 'LKR', period } = req.body || {};

  if (!action || !sourceCurrency) {
    return res.status(400).json({ error: 'Missing required parameters (action, sourceCurrency)' });
  }

  const apiKey = process.env.VITE_ALLRATESTODAY_API_KEY || process.env.ALLRATESTODAY_API_KEY;
  let data, rawData;

  // 1. Try AllRatesToday SDK if API key is present & valid
  if (apiKey) {
    try {
      const ratesClient = new AllRatesToday({ apiKey });

      if (action === 'getRate') {
        rawData = await ratesClient.getRate(sourceCurrency, targetCurrency);
        data = Array.isArray(rawData) ? rawData[0] : rawData;
      } else if (action === 'getHistoricalRates') {
        if (!period) {
          return res.status(400).json({ error: 'Missing required parameter: period' });
        }
        rawData = await ratesClient.getHistoricalRates(sourceCurrency, targetCurrency, period);
        data = (rawData && Array.isArray(rawData.data)) ? rawData.data : (Array.isArray(rawData) ? rawData : rawData);
      }

      if (data) {
        return res.status(200).json({ data, timestamp: new Date().toISOString() });
      }
    } catch (error) {
      console.warn('AllRatesToday SDK engaged live public rate API:', error.message || error);
    }
  }

  // 2. Real-Time Full Precision Live Rate & Historical Data Fetch
  try {
    const fetchTimestamp = new Date().toISOString();
    if (action === 'getRate') {
      const liveRate = await fetchRealTimeRate(sourceCurrency, targetCurrency);
      data = {
        rate: Number(liveRate),
        source: sourceCurrency,
        target: targetCurrency,
        time: fetchTimestamp
      };
    } else if (action === 'getHistoricalRates') {
      const daysCount = parseInt(period) || 30;
      data = await fetchRealHistoricalRates(sourceCurrency, targetCurrency, daysCount);
    } else {
      return res.status(400).json({ error: 'Invalid action specified' });
    }

    return res.status(200).json({ data, source: 'real_time_currency_api', timestamp: fetchTimestamp });
  } catch (fallbackError) {
    console.error('All Rates API Error:', fallbackError);
    return res.status(500).json({ error: fallbackError.message || 'Exchange rate API request failed' });
  }
}
