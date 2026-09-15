import { getRecommendation, getChannels, DEFAULT_PAIR } from './api.js';
import { calculateEffectiveRates } from '../utils/channelComparison.js';

/**
 * Sends prompt payload to the serverless backend function (/api/coach).
 *
 * @param {Object} payload 
 * @returns {Promise<string>}
 */
async function callCoachApi(payload) {
  const res = await fetch('/api/coach', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`[HTTP ${res.status}] ${errorData.error || 'Serverless Coach API request failed'}`);
  }

  const data = await res.json();
  if (!data.text) {
    throw new Error('No text returned from coach API');
  }
  return data.text;
}

export async function getCoachResponse(userMessage, conversationHistory = [], pair = DEFAULT_PAIR) {
  let recommendation;
  let channels = [];
  try {
    // 1. Gather current REAL live market context from AllRatesToday API
    recommendation = await getRecommendation(pair);
    channels = await getChannels(500, pair);
    
    // Sort channels by effective rate to find the best and worst easily
    const bestChannel = channels[0] || {};
    const flaggedChannels = channels.filter(c => c.flagged);
    
    const contextStr = `
Current Market Context (${pair.replace('_', ' to ')}):
- Today's Live Rate: ${recommendation.currentRate}
- 7-Day Average: ${recommendation.avgRate7d}
- Trend Verdict: ${recommendation.verdict} (Difference: ${recommendation.percentDiff}%)

Channel Information (for sending 500 ${pair.split('_')[0]}):
- Best Channel: ${bestChannel.channel || 'Wise'} (Effective Rate: ${bestChannel.effectiveRate || recommendation.currentRate}, Fee: ${bestChannel.feePercent || 0.4}%)
${flaggedChannels.length > 0 ? `- Warning: Avoid ${flaggedChannels.map(c => c.channel).join(', ')} as their fees are above 2%.` : ''}
    `.trim();

    // 2. Construct the system instruction
    const systemInstruction = `
You are a supportive, plain-English financial coach for Sri Lankan families receiving remittances.
Your goal is to directly answer the user's question, provide clear conversational explainability for why a timing or channel is good/bad.
Keep your responses concise (2-4 sentences max).
Use a reassuring and clear tone. Do NOT use complex financial jargon.
If the user asks about the current situation or best ways to send, use the provided context below.

${contextStr}
    `.trim();

    // 3. Format conversation history
    const historyText = conversationHistory
      .filter(msg => msg.type !== 'divider')
      .map(msg => `${msg.role === 'user' ? 'User' : 'Coach'}: ${msg.message}`)
      .join('\n');

    const fullSystemInstruction = `${systemInstruction}\n\nHere is the conversation so far:\n${historyText}`;

    // 4. Call serverless backend proxy endpoint
    return await callCoachApi({
      systemInstruction: fullSystemInstruction,
      userMessage,
    });
  } catch (error) {
    console.warn("Coach API unavailable, using fallback:", error.message);
    // Graceful fallback using recommendation if available
    const rec = recommendation || { verdict: 'NEUTRAL' };
    let fallbackMsg = "I'm having a little trouble connecting right now, but I can still tell you that ";
    if (rec.verdict === 'CONVERT_NOW') {
      fallbackMsg += "rates are looking strong today compared to the last week. It's a good time to send!";
    } else if (rec.verdict === 'WAIT') {
      fallbackMsg += "rates are a bit lower than average right now. You might want to wait a few days if you can.";
    } else {
      fallbackMsg += "rates are fairly average today. It's an okay time to send if you need to.";
    }
    return fallbackMsg;
  }
}

export async function getDynamicTrendInterpretation(fxHistory, currentRate) {
  try {
    const historyData = Array.isArray(fxHistory) ? fxHistory.map(d => `${d.date}: ${d.rate}`).join(', ') : '';
    const systemInstruction = `
You are a quantitative FinTech analyst speaking plainly to a non-technical family in Sri Lanka.
Your goal is to analyze the numeric trajectory of the exchange rate over the past 30 days.
Identify if it is peaking, dropping, or stable compared to the 30-day average.

Input Data:
- Today's Rate: ${currentRate}
- 30-Day History (Oldest to Newest): ${historyData}

Return strictly a 1-2 sentence plain-language explanation of the trend (e.g., "Rates have steadily dipped 2% over the past three days, but are still above the monthly average.").
Do NOT return JSON. Do NOT use markdown formatting.
    `.trim();

    return await callCoachApi({
      systemInstruction,
      userMessage: "Please interpret this trend.",
    });
  } catch (error) {
    console.warn("Gemini API Error (Trend):", error.message);
    return null; // Return null so Dashboard falls back to static message
  }
}

/**
 * Generates a short, warm, plain-language AI summary of user remittance patterns.
 * 
 * @param {Object} patternData Computed metrics from patternRecognition.js
 * @returns {Promise<string>} 2-3 sentence AI insight or graceful fallback
 */
export async function getPatternInsight(patternData) {
  if (!patternData || !patternData.hasEnoughData) {
    return "Once you have at least two past transfer records, I'll be able to spot your family's remittance patterns and help you plan ahead!";
  }

  const { avgDaysBetweenTransfers, avgDaysToConvert, expectedNextDate, topChannel, avgAmount, totalTransfers } = patternData;

  // Warm fallback message if offline or if AI call fails
  const fallbackInsight = `Based on your last ${totalTransfers} transfers, your family typically receives funds about every ${avgDaysBetweenTransfers} days (usually around ${avgAmount} via ${topChannel || 'digital channels'}). Your next transfer is likely expected around ${expectedNextDate}, and funds are generally converted within ${avgDaysToConvert} day(s).`;

  try {
    const systemInstruction = `
You are a supportive, plain-English financial coach for Sri Lankan families receiving remittances.
Your goal is to summarize the family's transfer routine in 2-3 warm, encouraging sentences without technical jargon.
Highlight how often they send, their typical channel, and when they can expect their next transfer.

Pattern Details:
- Total transfers recorded: ${totalTransfers}
- Average days between transfers: ${avgDaysBetweenTransfers} days
- Average days to convert/spend: ${avgDaysToConvert} days
- Projected next transfer date: ${expectedNextDate}
- Most frequently used channel: ${topChannel || 'Not specified'}
- Average transfer amount: ${avgAmount}
    `.trim();

    return await callCoachApi({
      systemInstruction,
      userMessage: "Please provide a warm pattern summary of our family's remittance routine.",
    });
  } catch (error) {
    console.warn("Pattern API unavailable, using fallback:", error.message);
    return fallbackInsight;
  }
}

export async function getChannelComparisonInsight(sendAmount, channelsData) {
  if (!channelsData || channelsData.length === 0) {
    return null;
  }

  try {
    const { sortedChannels, bestChannel } = calculateEffectiveRates(sendAmount, channelsData);
    
    // Pick top 3 for the AI context to keep it concise
    const topChannels = sortedChannels.slice(0, 3).map(ch => 
      `${ch.channel}: Flat Fee = ${ch.flatFee}, % Fee = ${ch.feePercent}%, Offered Rate = ${ch.offeredRate}, Final Payout = ${ch.finalPayout} LKR`
    ).join(' | ');

    const systemInstruction = `
You are a helpful, plain-English financial coach for Sri Lankan families.
Your goal is to explain why a specific remittance channel is the best option for a given send amount, mathematically.

Input Data:
- Send Amount: ${sendAmount}
- Best Channel: ${bestChannel.channel} (Payout: ${bestChannel.finalPayout} LKR)
- Top Channels Data: ${topChannels}

Task:
Explain exactly WHY the best channel won for this specific amount. Specifically highlight if a competing channel looks cheap (e.g., "zero fees") but loses money due to a high exchange rate margin.
Return a strict 2-3 sentence explanation. Do NOT use markdown formatting or tables. Keep it conversational.
    `.trim();

    return await callCoachApi({
      systemInstruction,
      userMessage: "Explain the best channel comparison.",
    });
  } catch (error) {
    console.warn("Gemini API Error (Channel Comparison):", error.message);
    return null; // Return null for graceful fallback
  }
}
