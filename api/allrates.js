import AllRatesToday from '@allratestoday/sdk';

/**
 * Vercel Serverless Function: /api/allrates
 * 
 * Securely proxies AllRatesToday SDK calls on the server side to bypass
 * browser CORS restrictions and hide the API key.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // The Vercel dashboard environment variable might be named with or without the VITE_ prefix,
  // we will check both just in case, but prefer the non-VITE version on the server.
  const apiKey = process.env.VITE_ALLRATESTODAY_API_KEY || process.env.ALLRATESTODAY_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'AllRatesToday API key environment variable is missing on server.' });
  }

  try {
    const ratesClient = new AllRatesToday({ apiKey });
    const { action, sourceCurrency, targetCurrency, period } = req.body || {};

    if (!action || !sourceCurrency || !targetCurrency) {
      return res.status(400).json({ error: 'Missing required parameters (action, sourceCurrency, targetCurrency)' });
    }

    let data;
    if (action === 'getRate') {
      data = await ratesClient.getRate(sourceCurrency, targetCurrency);
    } else if (action === 'getHistoricalRates') {
      if (!period) {
         return res.status(400).json({ error: 'Missing required parameter: period' });
      }
      data = await ratesClient.getHistoricalRates(sourceCurrency, targetCurrency, period);
    } else {
      return res.status(400).json({ error: 'Invalid action specified' });
    }

    return res.status(200).json({ data });
  } catch (error) {
    console.error('Serverless AllRatesToday API Error:', error);
    return res.status(500).json({ error: error.message || 'AllRatesToday API request failed' });
  }
}
