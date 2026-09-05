/**
 * Pure mathematical utility for analyzing remittance history patterns.
 * 
 * Functions here take raw history entries and compute transfer frequency,
 * expected next dates, and conversion timing without any side effects.
 */

/**
 * Computes behavioral remittance pattern metrics from past transfer history.
 *
 * @param {Array<{date: string, amount: number, channel: string, [key: string]: any}>} history 
 * @returns {{
 *   hasEnoughData: boolean,
 *   avgDaysBetweenTransfers: number,
 *   avgDaysToConvert: number,
 *   expectedNextDate: string | null,
 *   totalTransfers: number,
 *   topChannel: string | null,
 *   avgAmount: number,
 *   currency?: string
 * }}
 */
export function computeRemittancePatterns(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      hasEnoughData: false,
      avgDaysBetweenTransfers: 0,
      avgDaysToConvert: 0,
      expectedNextDate: null,
      totalTransfers: 0,
      topChannel: null,
      avgAmount: 0,
      currency: 'USD',
    };
  }

  if (history.length === 1) {
    const single = history[0];
    const nextD = new Date(new Date(single.date).getTime() + 30 * 24 * 60 * 60 * 1000);
    return {
      hasEnoughData: false,
      avgDaysBetweenTransfers: 30,
      avgDaysToConvert: 2,
      expectedNextDate: nextD.toISOString().slice(0, 10),
      totalTransfers: 1,
      topChannel: single.channel || null,
      avgAmount: Number(single.amount) || 0,
      currency: single.currency || 'USD',
    };
  }

  // Sort records chronologically (oldest -> newest)
  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Compute intervals between consecutive transfers (in days)
  const intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].date);
    const currDate = new Date(sorted[i].date);
    const diffMs = currDate.getTime() - prevDate.getTime();
    const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    intervals.push(diffDays);
  }

  const totalIntervalDays = intervals.reduce((sum, days) => sum + days, 0);
  const avgDaysBetweenTransfers = Math.round((totalIntervalDays / intervals.length) * 10) / 10;

  // Compute average days to convert
  const conversionDelays = sorted
    .map(entry => entry.convertedDays ?? entry.processingDays)
    .filter(val => typeof val === 'number');

  const avgDaysToConvert = conversionDelays.length > 0
    ? Math.round((conversionDelays.reduce((s, v) => s + v, 0) / conversionDelays.length) * 10) / 10
    : 1.5;

  // Calculate projected next transfer date based on latest date + avg interval
  const latestDate = new Date(sorted[sorted.length - 1].date);
  const nextDate = new Date(latestDate.getTime());
  nextDate.setDate(nextDate.getDate() + Math.round(avgDaysBetweenTransfers));
  const expectedNextDate = nextDate.toISOString().slice(0, 10);

  // Aggregate channel frequency & average amount
  const channelCounts = {};
  let totalAmount = 0;

  sorted.forEach(entry => {
    const amt = Number(entry.amount) || 0;
    totalAmount += amt;
    if (entry.channel) {
      channelCounts[entry.channel] = (channelCounts[entry.channel] || 0) + 1;
    }
  });

  let topChannel = null;
  let maxCount = 0;
  Object.entries(channelCounts).forEach(([channel, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topChannel = channel;
    }
  });

  const avgAmount = Math.round(totalAmount / sorted.length);

  return {
    hasEnoughData: true,
    avgDaysBetweenTransfers,
    avgDaysToConvert,
    expectedNextDate,
    totalTransfers: sorted.length,
    topChannel,
    avgAmount,
    currency: sorted[0]?.currency || 'USD',
  };
}

export function formatPatternData(patternData) {
  if (!patternData || !patternData.expectedNextDate) return null;

  const dateObj = new Date(patternData.expectedNextDate);
  const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(dateObj);

  return {
    ...patternData,
    expectedNextDateFormatted: formattedDate,
    avgAmountFormatted: `~$${patternData.avgAmount} ${patternData.currency || 'USD'}`
  };
}

export function checkProactiveNudge(expectedNextDate, currentTrend) {
  if (!expectedNextDate) return false;
  
  const nextDate = new Date(expectedNextDate);
  const today = new Date();
  
  // Difference in hours
  const diffTime = nextDate.getTime() - today.getTime();
  const diffHours = diffTime / (1000 * 60 * 60);
  
  // Within a 48 hour window (+/-) and trend is peaking
  if (Math.abs(diffHours) <= 48 && currentTrend === 'CONVERT_NOW') {
    return true;
  }
  
  return false;
}
