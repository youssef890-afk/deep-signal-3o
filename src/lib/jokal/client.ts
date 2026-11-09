import {
  JOKAL_LIMITS,
  type JokalChatResponse,
} from '@/lib/jokal/types';

export interface SendIdeaInput {
  message: string;
  conversationId?: string | null;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export async function sendJokalMessage({
  message,
  conversationId = null,
}: SendIdeaInput): Promise<JokalChatResponse> {
  const trimmed = message.trim();
  if (!trimmed) {
    return {
      conversationId,
      messageId: null,
      stage: 'conversation',
      status: 'draft',
      approval: 'not_required',
      reply: '',
      clarifyingQuestions: [],
      proposal: null,
      usage: null,
      error: 'اكتب الفكرة ديالك قبل ما تبعثها.',
    };
  }

  if (trimmed.length > JOKAL_LIMITS.maxIdeaChars) {
    return {
      conversationId,
      messageId: null,
      stage: 'conversation',
      status: 'draft',
      approval: 'not_required',
      reply: '',
      clarifyingQuestions: [],
      proposal: null,
      usage: null,
      error: `الفكرة طويلة بزاف. الحد الأقصى ${JOKAL_LIMITS.maxIdeaChars} حرف.`,
    };
  }

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: trimmed, mode: 'signal' }),
    });
    const responseText = await response.text();
    let data: { response?: unknown; reply?: unknown; error?: unknown } = {};
    try {
      data = JSON.parse(responseText) as typeof data;
    } catch {
      // Keep the response body for diagnostics below while showing a friendly UI error.
    }
    const assistantReply = typeof data.response === 'string' ? data.response : data.reply;

    if (response.status !== 200 || typeof assistantReply !== 'string' || !assistantReply.trim()) {
      const safeResponseText = responseText
        .replace(/\bAQ\.[A-Za-z0-9_-]+/g, '[REDACTED]')
        .replace(/\bAIza[A-Za-z0-9_-]+/g, '[REDACTED]')
        .replace(/\beyJ[A-Za-z0-9_-]{24,}/g, '[REDACTED]');
      console.error('AI chat API request failed:', {
        status: response.status,
        responseText: safeResponseText,
      });
      return {
        conversationId,
        messageId: null,
        stage: 'conversation',
        status: 'draft',
        approval: 'not_required',
        reply: '',
        clarifyingQuestions: [],
        proposal: null,
        usage: null,
        error: 'تعذّر الاتصال بالمساعد الآن. حاول مرة أخرى.',
      };
    }

    return {
      conversationId: conversationId ?? crypto.randomUUID(),
      messageId: null,
      stage: 'conversation',
      status: 'draft',
      approval: 'not_required',
      reply: assistantReply.trim(),
      clarifyingQuestions: [],
      proposal: null,
      usage: null,
    };
  } catch (error) {
    console.error('AI chat API request failed:', error);
    return {
      conversationId,
      messageId: null,
      stage: 'conversation',
      status: 'draft',
      approval: 'not_required',
      reply: '',
      clarifyingQuestions: [],
      proposal: null,
      usage: null,
      error: 'تعذّر الاتصال بالمساعد الآن. حاول مرة أخرى.',
    };
  }
}
