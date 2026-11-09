import {
  JOKAL_LIMITS,
  type JokalChatResponse,
} from '@/lib/jokal/types';
import { supabase } from '@/lib/supabase';

export interface JokalImagePayload {
  mimeType: string;
  data: string;
}

export interface SendIdeaInput {
  message: string;
  conversationId?: string | null;
  history?: { role: 'user' | 'assistant'; content: string }[];
  image?: JokalImagePayload;
  mode?: 'signal' | 'image';
}

export interface JokalSendResult extends JokalChatResponse {
  errorCode?: string;
  image?: JokalImagePayload;
}

const EMPTY_RESULT = {
  messageId: null,
  stage: 'conversation',
  status: 'draft',
  approval: 'not_required',
  reply: '',
  clarifyingQuestions: [],
  proposal: null,
  usage: null,
} satisfies Omit<JokalChatResponse, 'conversationId' | 'error'>;

function failedResult(
  conversationId: string | null,
  error: string,
  errorCode = 'REQUEST_FAILED',
): JokalSendResult {
  return {
    ...EMPTY_RESULT,
    conversationId,
    error,
    errorCode,
  };
}

function parseImage(value: unknown): JokalImagePayload | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const image = value as { mimeType?: unknown; data?: unknown };
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(String(image.mimeType))
    || typeof image.data !== 'string'
    || image.data.length === 0
    || image.data.length > 4 * 1024 * 1024
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(image.data)) {
    return undefined;
  }
  return { mimeType: image.mimeType as string, data: image.data };
}

export async function sendJokalMessage({
  message,
  conversationId = null,
  history = [],
  image,
  mode = 'signal',
}: SendIdeaInput): Promise<JokalSendResult> {
  const trimmed = message.trim();
  if (!trimmed) {
    return failedResult(conversationId, 'اكتب رسالتك قبل الإرسال.', 'INVALID_REQUEST');
  }

  if (trimmed.length > JOKAL_LIMITS.maxIdeaChars) {
    return failedResult(
      conversationId,
      `الرسالة طويلة بزاف. الحد الأقصى ${JOKAL_LIMITS.maxIdeaChars} حرف.`,
      'INVALID_REQUEST',
    );
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken) {
      return failedResult(conversationId, 'سجّل الدخول لاستخدام المساعد.', 'AUTH_REQUIRED');
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: trimmed,
        history: history.slice(-9).map(({ role, content }) => ({ role, content })),
        ...(image ? { image } : {}),
        mode,
      }),
    });

    let data: {
      response?: unknown;
      reply?: unknown;
      image?: unknown;
      error?: unknown;
      code?: unknown;
    } = {};
    try {
      data = await response.json() as typeof data;
    } catch {
      console.error('AI chat API returned an unreadable response:', { status: response.status });
    }

    const assistantReply = typeof data.response === 'string' ? data.response : data.reply;
    const generatedImage = parseImage(data.image);
    if (!response.ok) {
      console.error('AI chat API request failed:', {
        status: response.status,
        code: typeof data.code === 'string' ? data.code : 'UNKNOWN',
      });
      return failedResult(
        conversationId,
        typeof data.error === 'string' ? data.error : 'تعذّر الاتصال بالمساعد الآن. حاول مرة أخرى.',
        typeof data.code === 'string' ? data.code : 'REQUEST_FAILED',
      );
    }
    if ((typeof assistantReply !== 'string' || !assistantReply.trim()) && !generatedImage) {
      console.error('AI chat API returned no usable content:', { status: response.status });
      return failedResult(conversationId, 'لم يصل رد صالح من المساعد. حاول مرة أخرى.');
    }
    if (mode === 'image' && !generatedImage) {
      console.error('AI image API response did not contain a valid image:', { status: response.status });
      return failedResult(conversationId, 'لم تصل صورة صالحة من المساعد. حاول مرة أخرى.', 'IMAGE_GENERATION_FAILED');
    }

    return {
      ...EMPTY_RESULT,
      conversationId: conversationId ?? crypto.randomUUID(),
      reply: typeof assistantReply === 'string' ? assistantReply.trim() : '',
      ...(generatedImage ? { image: generatedImage } : {}),
    };
  } catch (error) {
    console.error('AI chat API request failed:', error instanceof Error ? error.message : 'Unknown request error');
    return failedResult(conversationId, 'تعذّر الاتصال بالمساعد الآن. حاول مرة أخرى.');
  }
}
