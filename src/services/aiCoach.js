import { GoogleGenAI } from '@google/genai';
import { getMockRecommendation, getMockChannels, DEFAULT_PAIR } from './mockData';

// Initialize the Gemini client. We handle the missing key case inside the function
// so that the app doesn't crash on startup if the key is missing.
let ai = null;
try {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
  }
} catch (e) {
  console.warn("Could not initialize GoogleGenAI client:", e);
}

export async function getCoachResponse(userMessage, conversationHistory = []) {
  if (!ai) {
    return "I'm currently running in offline mode. Please add your Gemini API key to `.env.local` to enable real-time responses!";
  }

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

    // 3. Format conversation history for Gemini
    // The Gemini API strictly requires alternating user/model roles. Since our mock
    // UI has the coach speaking multiple times in a row, sending it directly in 'contents'
    // will crash the API. Instead, we'll inject the recent history into the system prompt.
    const historyText = conversationHistory
      .filter(msg => msg.type !== 'divider')
      .map(msg => `${msg.role === 'user' ? 'User' : 'Coach'}: ${msg.message}`)
      .join('\n');

    const fullSystemInstruction = `${systemInstruction}\n\nHere is the conversation so far:\n${historyText}`;

    // 4. Call the Gemini API with only the latest user message in 'contents'
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      config: {
        systemInstruction: fullSystemInstruction,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
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
  if (!ai) {
    return null; // Return null so Dashboard falls back to static message
  }

  try {
    const historyData = fxHistory.map(d => `${d.date}: ${d.rate}`).join(', ');
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{ role: 'user', parts: [{ text: "Please interpret this trend." }] }],
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error (Trend):", error);
    return null; // Return null so Dashboard falls back to static message
  }
}
