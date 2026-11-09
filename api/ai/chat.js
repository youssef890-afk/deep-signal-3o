import { authorizeAiRequest } from '../_lib/ai-auth.js';

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 10;
const PROVIDER_TIMEOUT_MS = 60000;
const MODEL_CATALOG = Object.freeze({
  openai: {
    apiKeyEnv: 'OPENAI_API_KEY',
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
  },
  claude: {
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    model: process.env.ANTHROPIC_CHAT_MODEL || 'claude-3-7-sonnet-latest',
    endpoint: 'https://api.anthropic.com/v1/messages',
  },
  deepseek: {
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    model: process.env.DEEPSEEK_CHAT_MODEL || 'deepseek-chat',
    endpoint: 'https://api.deepseek.com/chat/completions',
  },
});

const SYSTEM_PROMPT = `You are DbSignal's AI assistant.
Be helpful, clear, and concise. Follow the language used by the user.`;

function sendError(res, status, code, error) {
  return res.status(status).json({ error, code });
}

function messagesFromRequest(body) {
  const { message, history = [] } = body;
  if (typeof message !== 'string' || !message.trim() || message.length > MAX_MESSAGE_LENGTH) {
    return { error: 'message must be a non-empty string of at most 4000 characters.' };
  }
  if (!Array.isArray(history)) {
    return { error: 'history must be an array.' };
  }

  const recent = history.slice(-MAX_HISTORY_MESSAGES);
  if (recent.some((item) => !item
    || !['user', 'assistant'].includes(item.role)
    || typeof item.content !== 'string'
    || !item.content.trim()
    || item.content.length > MAX_MESSAGE_LENGTH)) {
    return { error: 'history contains an invalid message.' };
  }

  return {
    message: message.trim(),
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...recent.map(({ role, content }) => ({ role, content: content.trim() })),
      { role: 'user', content: message.trim() },
    ],
  };
}

function providerRequest(provider, model, messages, apiKey, signal) {
  if (provider === 'claude') {
    const [{ content: system }, ...conversation] = messages;
    return fetch(MODEL_CATALOG.claude.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system,
        messages: conversation,
        stream: true,
      }),
      signal,
    });
  }

  return fetch(MODEL_CATALOG[provider].endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });
}

function writeEvent(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function parseProviderEvent(provider, eventBlock) {
  const data = eventBlock
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n');
  if (!data || data === '[DONE]') return null;

  try {
    const payload = JSON.parse(data);
    if (provider === 'claude') {
      if (payload.type === 'content_block_delta' && payload.delta?.type === 'text_delta') {
        return payload.delta.text;
      }
      return null;
    }
    const text = payload.choices?.[0]?.delta?.content;
    return typeof text === 'string' ? text : null;
  } catch {
    return null;
  }
}

async function relayProviderStream(provider, upstream, res) {
  const reader = upstream.body?.getReader();
  if (!reader) throw new Error('The model provider did not return a readable stream.');

  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');
    let separator = buffer.indexOf('\n\n');
    while (separator !== -1) {
      const eventBlock = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      const text = parseProviderEvent(provider, eventBlock);
      if (text) writeEvent(res, { type: 'delta', text });
      separator = buffer.indexOf('\n\n');
    }
    if (done) break;
  }
  writeEvent(res, { type: 'done' });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Only POST is supported.');
  }

  const provider = req.body?.model;
  if (typeof provider !== 'string' || !Object.hasOwn(MODEL_CATALOG, provider)) {
    return sendError(res, 400, 'UNSUPPORTED_MODEL', 'Choose one of: openai, claude, deepseek.');
  }

  const request = messagesFromRequest(req.body ?? {});
  if (request.error) return sendError(res, 400, 'INVALID_REQUEST', request.error);

  const apiKey = process.env[MODEL_CATALOG[provider].apiKeyEnv];
  if (!apiKey) {
    console.error('AI provider is not configured:', provider);
    return sendError(res, 503, 'PROVIDER_NOT_CONFIGURED', `The ${provider} provider is not configured.`);
  }

  const authorization = await authorizeAiRequest(req, 'signal');
  if (authorization.error) {
    return sendError(
      res,
      authorization.error.status,
      authorization.error.code,
      authorization.error.message
        || (authorization.error.code === 'DAILY_LIMIT_REACHED'
          ? 'Daily chat limit reached.'
          : 'Sign in is required or the AI service is temporarily unavailable.'),
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  let headersSent = false;
  try {
    const upstream = await providerRequest(
      provider,
      MODEL_CATALOG[provider].model,
      request.messages,
      apiKey,
      controller.signal,
    );

    if (!upstream.ok) {
      console.error('AI provider request failed:', { provider, status: upstream.status });
      return sendError(res, 502, 'PROVIDER_REQUEST_FAILED', 'The selected AI provider could not complete the request.');
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    headersSent = true;
    res.flushHeaders?.();
    await relayProviderStream(provider, upstream, res);
    res.end();
  } catch (error) {
    console.error('AI streaming request failed:', {
      provider,
      error: error instanceof Error ? error.message : 'Unknown streaming error',
    });
    if (headersSent) {
      writeEvent(res, { type: 'error', error: 'The AI response was interrupted.' });
      res.end();
    } else {
      sendError(res, 502, 'PROVIDER_UNAVAILABLE', 'The AI provider is temporarily unavailable.');
    }
  } finally {
    clearTimeout(timeout);
  }
}
