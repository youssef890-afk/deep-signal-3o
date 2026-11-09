const MAX_MESSAGE_LENGTH = 4000;
const MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
const PROVIDER_TIMEOUT_MS = 25000;

const SYSTEM_PROMPT = `You are Deep-Signal AI, the official AI assistant for the Deep-Signal social platform.
Your name is Deep-Signal AI. If asked who you are, say you are the assistant for Deep-Signal.
Never mention Gemini, Google, or any underlying model or provider.
Be friendly, concise, and helpful. Reply in Moroccan Darija by default.
If the user writes in French, English, or Modern Standard Arabic, reply in that language.
Help users understand and use Deep-Signal features. Do not claim to perform actions on their account.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'الطريقة غير مدعومة.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Deep-Signal AI is not configured: GEMINI_API_KEY is missing.');
    return res.status(500).json({ error: 'خدمة المساعد غير مهيأة حالياً.' });
  }

  const { message, mode = 'signal' } = req.body ?? {};
  if (mode !== 'signal') {
    return res.status(400).json({ error: 'نوع الطلب غير مدعوم.' });
  }
  if (typeof message !== 'string' || !message.trim() || message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `أرسل رسالة نصية لا تتجاوز ${MAX_MESSAGE_LENGTH} حرف.` });
  }

  try {
    let providerResponse;
    for (const [index, model] of MODELS.entries()) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
      try {
        providerResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
              contents: [{ role: 'user', parts: [{ text: message.trim() }] }],
              generationConfig: { maxOutputTokens: 512 },
            }),
            signal: controller.signal,
          },
        );
      } finally {
        clearTimeout(timeout);
      }

      if (providerResponse.ok || providerResponse.status !== 404 || index === MODELS.length - 1) {
        break;
      }
      console.error('Deep-Signal AI model unavailable; trying fallback model:', providerResponse.status);
    }

    if (!providerResponse.ok) {
      console.error('Deep-Signal AI provider request failed:', providerResponse.status);
      return res.status(502).json({ error: 'تعذّر الحصول على رد من المساعد الآن.' });
    }

    const data = await providerResponse.json();
    const answer = data?.candidates?.[0]?.content?.parts
      ?.map((part) => typeof part.text === 'string' ? part.text : '')
      .join('')
      .trim();

    if (!answer) {
      console.error('Deep-Signal AI provider returned an empty response.');
      return res.status(502).json({ error: 'لم يصل رد من المساعد الآن. حاول مرة أخرى.' });
    }

    return res.status(200).json({ response: answer, reply: answer });
  } catch (error) {
    console.error('Deep-Signal AI request failed:', error instanceof Error ? error.message : 'Unknown service error');
    return res.status(502).json({ error: 'تعذّر الاتصال بالمساعد الآن. حاول مرة أخرى.' });
  }
}
