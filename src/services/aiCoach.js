import { getMockRecommendation, getMockChannels, DEFAULT_PAIR } from './mockData';

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
    throw new Error(errorData.error || `Serverless API responded with ${res.status}`);
  }

  const data = await res.json();
  if (!data.text) {
    throw new Error('No text returned from coach API');
  }
  return data.text;
}

export async function getCoachResponse(userMessage, conversationHistory = []) {
  try {
    // 1. Gather current context
    const recommendation = getMockRecommendation(DEFAULT_PAIR);
    const channels = getMockChannels(500, DEFAULT_PAIR); // Assuming 500 amount for context
    
    // Sort channels by effective rate to find the best and worst easily
    const bestChannel = channels[0];
    const flaggedChannels = channels.filter(c => c.flagged);
    
    const contextStr = `
Current Market Context (USD to LKR):
- Today's Rate: ${recommendation.currentRate}
- 7-Day Average: ${recommendation.avgRate7d}
- Trend Verdict: ${recommendation.verdict} (Difference: ${recommendation.percentDiff}%)

Channel Information (for sending 500 USD):
- Best Channel: ${bestChannel.channel} (Effective Rate: ${bestChannel.effectiveRate}, Fee: ${bestChannel.feePercent}%)
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
    // Graceful fallback
    const recommendation = getMockRecommendation(DEFAULT_PAIR);
    let fallbackMsg = "I'm having a little trouble connecting right now, but I can still tell you that ";
    if (recommendation.verdict === 'CONVERT_NOW') {
      fallbackMsg += "rates are looking strong today compared to the last week. It's a good time to send!";
    } else if (recommendation.verdict === 'WAIT') {
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
