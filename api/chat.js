import { createClient } from '@supabase/supabase-js';

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 9;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_GENERATED_IMAGE_BYTES = 3 * 1024 * 1024;
const MODEL_CHAT = 'gemini-3.1-flash-lite';
const MODEL_CHAT_FALLBACK = 'gemini-3.8-flash';
const MODEL_IMAGE = 'gemini-2.5-flash-image';
const PROVIDER_TIMEOUT_MS = 25000;
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const SYSTEM_PROMPT = `You are Deep-Signal AI, the official AI assistant for the Deep-Signal social platform.
Your name is Deep-Signal AI. If asked who you are, say you are the assistant for Deep-Signal.
Never mention Gemini, Google, or any underlying model or provider.
Be friendly, concise, and helpful. Reply in Moroccan Darija by default.
If the user writes in French, English, or Modern Standard Arabic, reply in that language.
Help users understand and use Deep-Signal features. Do not claim to perform actions on their account.`;

const IMAGE_PROMPT = `${SYSTEM_PROMPT}
The user is asking you to create an image from their description. Create a suitable image and, if possible, briefly describe the result in the user's language.`;

function sendError(res, status, code, error) {
  return res.status(status).json({ error, code });
}

function getProviderError(response, apiKey) {
  return response.json()
    .then((body) => {
      const message = typeof body?.error?.message === 'string'
        ? body.error.message
        : 'Provider returned an error without a message.';
      return message.replaceAll(apiKey, '[REDACTED]').slice(0, 500);
    })
    .catch(() => 'Provider returned a non-JSON error response.');
}

async function callProvider(model, payload, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    return await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );
  } finally {
    clearTimeout(timeout);
  }
}

function validImage(image) {
  if (!image || typeof image !== 'object'
    || !IMAGE_MIME_TYPES.has(image.mimeType)
    || typeof image.data !== 'string'
    || image.data.length === 0
    || image.data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) {
    return false;
  }

  const bytes = Buffer.from(image.data, 'base64');
  return bytes.length > 0
    && bytes.length <= MAX_IMAGE_BYTES
    && bytes.toString('base64') === image.data;
}

function textContents(history) {
  if (history === undefined) return [];
  if (!Array.isArray(history)) return null;

  const recent = history.slice(-MAX_HISTORY_MESSAGES);
  if (recent.some((item) => !item
    || !['user', 'assistant'].includes(item.role)
    || typeof item.content !== 'string'
    || !item.content.trim()
    || item.content.length > MAX_MESSAGE_LENGTH)) {
    return null;
  }

  return recent.map((item) => ({
    role: item.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: item.content.trim() }],
  }));
}

function isSafetyBlocked(data) {
  return data?.promptFeedback?.blockReason
    || data?.candidates?.[0]?.finishReason === 'SAFETY'
    || data?.candidates?.[0]?.finishReason === 'IMAGE_SAFETY'
    || data?.candidates?.[0]?.finishReason === 'PROHIBITED_CONTENT'
    || data?.candidates?.[0]?.finishReason === 'BLOCKLIST';
}

function providerParts(data) {
  const candidate = data?.candidates?.[0];
  if (!candidate || isSafetyBlocked(data)) return null;
  return Array.isArray(candidate.content?.parts) ? candidate.content.parts : [];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'الطريقة غير مدعومة.');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Deep-Signal AI is not configured: GEMINI_API_KEY is missing.');
    return sendError(res, 500, 'SERVICE_NOT_CONFIGURED', 'خدمة المساعد غير مهيأة حالياً.');
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Deep-Signal AI Supabase configuration is missing.');
    return sendError(
      res,
      500,
      'SUPABASE_NOT_CONFIGURED',
      'إعدادات Supabase ناقصة. أضف SUPABASE_URL وSUPABASE_ANON_KEY إلى إعدادات الخادم.',
    );
  }

  const authorization = req.headers.authorization;
  const tokenMatch = typeof authorization === 'string'
    ? authorization.match(/^Bearer\s+(.+)$/i)
    : null;
  if (!tokenMatch) {
    return sendError(res, 401, 'AUTH_REQUIRED', 'سجّل الدخول لاستخدام المساعد.');
  }

  const {
    message,
    history,
    image,
    mode = 'signal',
  } = req.body ?? {};

  if (mode !== 'signal' && mode !== 'image') {
    return sendError(res, 400, 'INVALID_REQUEST', 'نوع الطلب غير مدعوم.');
  }
  if (typeof message !== 'string' || !message.trim() || message.length > MAX_MESSAGE_LENGTH) {
    return sendError(res, 400, 'INVALID_REQUEST', `أرسل وصفاً أو سؤالاً لا يتجاوز ${MAX_MESSAGE_LENGTH} حرف.`);
  }
  if (mode === 'image' && image !== undefined) {
    return sendError(res, 400, 'INVALID_REQUEST', 'لا يمكن إرفاق صورة عند طلب توليد صورة.');
  }
  if (image !== undefined && !validImage(image)) {
    const supportedType = image && IMAGE_MIME_TYPES.has(image.mimeType);
    return sendError(
      res,
      400,
      supportedType ? 'INVALID_IMAGE' : 'IMAGE_TYPE_UNSUPPORTED',
      supportedType
        ? 'تعذّر قراءة الصورة. أعد اختيارها وحاول مرة أخرى.'
        : 'نوع الصورة غير مدعوم. استخدم JPEG أو PNG أو WebP.',
    );
  }

  const contents = mode === 'signal' ? textContents(history) : [];
  if (!contents) {
    return sendError(res, 400, 'INVALID_HISTORY', 'تعذّر استخدام سياق المحادثة. ابدأ رسالة جديدة وحاول مرة أخرى.');
  }

  if (mode === 'signal' && image !== undefined) {
    contents.push({
      role: 'user',
      parts: [{ text: message.trim() }, { inlineData: image }],
    });
  } else {
    contents.push({
      role: 'user',
      parts: [{ text: message.trim() }],
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${tokenMatch[1].trim()}`,
      },
    },
  });
  try {
    const { data: userData, error: authError } = await supabase.auth.getUser(tokenMatch[1].trim());
    if (authError || !userData.user) {
      return sendError(res, 401, 'AUTH_REQUIRED', 'انتهت جلسة الدخول. سجّل الدخول ثم حاول مرة أخرى.');
    }

    const { data: quotaAllowed, error: quotaError } = await supabase.rpc(
      'consume_jokal_ai_quota',
      { p_mode: mode },
    );
    if (quotaError) {
      console.error('Deep-Signal AI quota check failed.');
      return sendError(res, 503, 'QUOTA_UNAVAILABLE', 'تعذّر التحقق من حد الاستخدام الآن. حاول مرة أخرى.');
    }
    if (quotaAllowed !== true) {
      const code = mode === 'image' ? 'DAILY_IMAGE_LIMIT' : 'DAILY_CHAT_LIMIT';
      const error = mode === 'image'
        ? 'وصلت إلى حد توليد الصور اليومي. حاول مجدداً غداً.'
        : 'وصلت إلى حد المحادثات اليومي. حاول مجدداً غداً.';
      return sendError(res, 429, code, error);
    }
  } catch {
    console.error('Deep-Signal AI authentication or quota request failed.');
    return sendError(res, 503, 'QUOTA_UNAVAILABLE', 'تعذّر التحقق من جلسة الدخول أو حد الاستخدام الآن.');
  }

  const payload = {
    systemInstruction: {
      parts: [{ text: mode === 'image' ? IMAGE_PROMPT : SYSTEM_PROMPT }],
    },
    contents,
    generationConfig: mode === 'image'
      ? { maxOutputTokens: 512, responseModalities: ['TEXT', 'IMAGE'] }
      : { maxOutputTokens: 512 },
  };
  const models = mode === 'image'
    ? [MODEL_IMAGE]
    : [MODEL_CHAT, MODEL_CHAT_FALLBACK];

  try {
    let providerResponse;
    for (const [index, model] of models.entries()) {
      providerResponse = await callProvider(model, payload, apiKey);
      if (providerResponse.ok) break;

      const providerError = await getProviderError(providerResponse, apiKey);
      const canFallback = mode === 'signal'
        && index < models.length - 1
        && [404, 429, 503].includes(providerResponse.status);
      console.error('Deep-Signal AI provider request failed:', {
        status: providerResponse.status,
        error: providerError,
      });
      if (!canFallback) break;
    }

    if (!providerResponse.ok) {
      return sendError(
        res,
        502,
        mode === 'image' ? 'IMAGE_GENERATION_FAILED' : 'PROVIDER_UNAVAILABLE',
        mode === 'image'
          ? 'تعذّر توليد الصورة الآن. حاول مرة أخرى.'
          : 'تعذّر الحصول على رد من المساعد الآن.',
      );
    }

    const data = await providerResponse.json();
    const parts = providerParts(data);
    if (!parts) {
      return sendError(res, 422, 'CONTENT_BLOCKED', 'عذراً، لا أستطيع المساعدة في هذا الطلب. جرّب وصفاً آخر مناسباً.');
    }

    const reply = parts
      .map((part) => typeof part.text === 'string' ? part.text : '')
      .join('')
      .trim();

    if (mode === 'image') {
      const generated = parts.find((part) => part.inlineData?.data);
      if (!generated
        || !IMAGE_MIME_TYPES.has(generated.inlineData.mimeType)
        || typeof generated.inlineData.data !== 'string') {
        return sendError(res, 502, 'IMAGE_GENERATION_FAILED', 'لم تصل صورة صالحة من المساعد. حاول مرة أخرى.');
      }

      const generatedBytes = Buffer.from(generated.inlineData.data, 'base64');
      if (generatedBytes.length === 0
        || generatedBytes.length > MAX_GENERATED_IMAGE_BYTES
        || generatedBytes.toString('base64') !== generated.inlineData.data) {
        return sendError(res, 502, 'IMAGE_GENERATION_FAILED', 'تعذّر تجهيز الصورة الناتجة. حاول مرة أخرى.');
      }

      return res.status(200).json({
        reply,
        image: {
          mimeType: generated.inlineData.mimeType,
          data: generated.inlineData.data,
        },
      });
    }

    if (!reply) {
      return sendError(res, 502, 'PROVIDER_UNAVAILABLE', 'لم يصل رد من المساعد الآن. حاول مرة أخرى.');
    }
    return res.status(200).json({ response: reply, reply });
  } catch (error) {
    console.error('Deep-Signal AI request failed:', error instanceof Error ? error.message : 'Unknown service error');
    return sendError(
      res,
      502,
      mode === 'image' ? 'IMAGE_GENERATION_FAILED' : 'PROVIDER_UNAVAILABLE',
      mode === 'image'
        ? 'تعذّر توليد الصورة الآن. حاول مرة أخرى.'
        : 'تعذّر الاتصال بالمساعد الآن. حاول مرة أخرى.',
    );
  }
}
