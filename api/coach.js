import { GoogleGenAI } from '@google/genai';

/**
 * Vercel Serverless Function: /api/coach
 * 
 * Securely proxies Gemini AI calls on the server side so that the
 * GEMINI_API_KEY is never exposed to the client-side browser bundle.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing on server.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const { systemInstruction, userMessage, contents } = req.body || {};

    const payloadContents = contents || [
      { role: 'user', parts: [{ text: userMessage || 'Hello' }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: payloadContents,
      config: {
        systemInstruction: systemInstruction || '',
      },
    });

    return res.status(200).json({ text: response.text });
  } catch (error) {
    console.error('Serverless Gemini API Error:', error);
    return res.status(500).json({ error: error.message || 'Gemini API request failed' });
  }
}
