export function computeRemittancePatterns(history) {
  if (!history || history.length === 0) {
    return {
      avgDaysBetweenTransfers: 0,
      avgDaysToConvert: 0,
      expectedNextDate: null,
      topChannel: 'Unknown',
      avgAmount: 0
    };
  }

  if (history.length === 1) {
    return {
      avgDaysBetweenTransfers: 30, // Default to 30 days if only one record
      avgDaysToConvert: 2,
      expectedNextDate: new Date(new Date(history[0].date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      topChannel: history[0].channel,
      avgAmount: history[0].amount,
      currency: history[0].currency
    };
  }

  const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let totalDays = 0;
  for (let i = 1; i < sorted.length; i++) {
    const diffTime = Math.abs(new Date(sorted[i].date) - new Date(sorted[i - 1].date));
    totalDays += diffTime / (1000 * 60 * 60 * 24);
  }
  
  const avgDaysBetweenTransfers = Math.round(totalDays / (sorted.length - 1));
  const avgDaysToConvert = 2; // Simulated default since not available in mock data

  const lastDate = new Date(sorted[sorted.length - 1].date);
  const nextDate = new Date(lastDate.getTime() + avgDaysBetweenTransfers * 24 * 60 * 60 * 1000);
  const expectedNextDate = nextDate.toISOString().split('T')[0];

  const channelCounts = {};
  let totalAmount = 0;
  sorted.forEach(record => {
    channelCounts[record.channel] = (channelCounts[record.channel] || 0) + 1;
    totalAmount += record.amount;
  });

  const topChannel = Object.keys(channelCounts).reduce((a, b) => channelCounts[a] > channelCounts[b] ? a : b);
  const avgAmount = Math.round(totalAmount / sorted.length);

  return {
    avgDaysBetweenTransfers,
    avgDaysToConvert,
    expectedNextDate,
    topChannel,
    avgAmount,
    currency: sorted[0].currency
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
