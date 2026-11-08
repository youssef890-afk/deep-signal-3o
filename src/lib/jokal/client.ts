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
    const data: { response?: unknown; reply?: unknown; error?: unknown } = await response.json();
    const assistantReply = typeof data.response === 'string' ? data.response : data.reply;

    if (response.status !== 200 || typeof assistantReply !== 'string' || !assistantReply.trim()) {
      console.error('AI chat API request failed:', response.status, data.error);
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
