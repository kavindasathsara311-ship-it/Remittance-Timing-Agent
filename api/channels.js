import AllRatesToday from '@allratestoday/sdk';

const CHANNEL_PROFILES = [
  { channel: 'Wise', feePercent: 0.4, icon: 'public', speed: 'Instant (under 1 hr)', payoutTypes: ['Bank Deposit'] },
  { channel: 'Instarem', feePercent: 0.7, icon: 'send', speed: 'Same day', payoutTypes: ['Bank Deposit', 'e-Wallet'] },
  { channel: 'Remitly', feePercent: 0.9, icon: 'account_balance_wallet', speed: 'Express (instant)', payoutTypes: ['Bank Deposit', 'Cash Pickup'] },
  { channel: 'WorldRemit', feePercent: 1.1, icon: 'payments', speed: 'Same day', payoutTypes: ['Bank Deposit', 'Cash Pickup'] },
  { channel: 'Bank of Ceylon', feePercent: 1.2, icon: 'museum', speed: '1 business day', payoutTypes: ['Direct Bank Deposit'] },
  { channel: "People's Bank", feePercent: 1.35, icon: 'account_balance', speed: '1-2 business days', payoutTypes: ['Direct Bank Deposit'] },
  { channel: 'Sampath Bank', feePercent: 1.5, icon: 'account_balance', speed: '1-2 business days', payoutTypes: ['Direct Bank Deposit'] },
  { channel: 'HNB', feePercent: 1.8, icon: 'account_balance', speed: '1-2 business days', payoutTypes: ['Direct Bank Deposit'] },
  { channel: 'Western Union', feePercent: 2.1, icon: 'currency_exchange', speed: 'Instant cash pickup', payoutTypes: ['Cash Pickup', 'Bank Deposit'] },
  { channel: 'Commercial Bank', feePercent: 2.3, icon: 'account_balance', speed: '1-2 business days', payoutTypes: ['Direct Bank Deposit'] },
];

/**
 * Vercel Serverless Function: /api/channels
 * 
 * Fetches live official mid-market exchange rate using AllRatesToday SDK or Open Exchange Rates API
 * and returns live channel details, effective rates, fees, family payout, transfer speed, and fee flags.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.VITE_ALLRATESTODAY_API_KEY || process.env.ALLRATESTODAY_API_KEY;

  let reqData = req.method === 'POST' ? req.body : req.query;
  if (typeof reqData === 'string') {
    try { reqData = JSON.parse(reqData); } catch {}
  }
  reqData = reqData || {};

  const pair = reqData.pair || 'USD_LKR';
  const sourceCurrency = reqData.sourceCurrency || pair.split('_')[0] || 'USD';
  const targetCurrency = reqData.targetCurrency || 'LKR';
  const amount = Number(reqData.amount) || 500;

  let currentRate = null;

  // Strategy 1: Try AllRatesToday SDK if API key exists
  if (apiKey) {
    try {
      const ratesClient = new AllRatesToday({ apiKey });
      const rateResponse = await ratesClient.getRate(sourceCurrency, targetCurrency);
      if (rateResponse) {
        currentRate = typeof rateResponse === 'number' 
          ? rateResponse 
          : Number(rateResponse.rate || rateResponse.value || rateResponse.currentRate);
      }
    } catch (err) {
      console.warn('Serverless AllRatesToday API warning for channels rate:', err.message);
    }
  }

  // Strategy 2: Fetch live official rate from Open Exchange Rates API
  if (!currentRate || isNaN(currentRate)) {
    try {
      const liveRes = await fetch(`https://open.er-api.com/v6/latest/${sourceCurrency}`);
      if (liveRes.ok) {
        const json = await liveRes.json();
        const rate = json?.rates?.[targetCurrency];
        if (typeof rate === 'number') {
          currentRate = rate;
        }
      }
    } catch (err) {
      console.warn('Open ER API error for channels rate:', err.message);
    }
  }

  // Fallback anchor if network is completely offline
  if (!currentRate || isNaN(currentRate)) {
    const anchors = { USD: 302.50, SAR: 82.50, AED: 83.20, GBP: 392.00 };
    currentRate = anchors[sourceCurrency] || 300;
  }

  const midMarketRate = Math.round(currentRate * 100) / 100;

  const channels = CHANNEL_PROFILES.map((tpl) => {
    const feePercent = tpl.feePercent;
    const effectiveRate = Math.round(midMarketRate * (1 - feePercent / 100) * 100) / 100;
    const receive = Math.round(amount * effectiveRate * 100) / 100;
    const gapFromMid = Math.round((midMarketRate - effectiveRate) * 100) / 100;
    const feeAmount = Math.round(amount * (feePercent / 100) * 100) / 100;

    return {
      channel: tpl.channel,
      icon: tpl.icon,
      speed: tpl.speed,
      payoutTypes: tpl.payoutTypes,
      midMarketRate,
      effectiveRate,
      feePercent,
      feeAmount,
      flagged: feePercent >= 2.0,
      receive,
      gapFromMid,
    };
  }).sort((a, b) => b.effectiveRate - a.effectiveRate);

  return res.status(200).json({
    data: {
      pair: `${sourceCurrency}_${targetCurrency}`,
      sourceCurrency,
      targetCurrency,
      amount,
      midMarketRate,
      updatedAt: new Date().toISOString(),
      channels,
    },
  });
}
