import { authorizeAiRequest } from '../_lib/ai-auth.js';

const MAX_TEXT_LENGTH = 4000;
const SPEECH_TIMEOUT_MS = 60000;
const VOICES = Object.freeze({
  female: 'nova',
  male: 'onyx',
});

function sendError(res, status, code, error) {
  return res.status(status).json({ error, code });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Only POST is supported.');
  }

  const { text, voice } = req.body ?? {};
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_LENGTH) {
    return sendError(res, 400, 'INVALID_REQUEST', 'text must be a non-empty string of at most 4000 characters.');
  }
  if (typeof voice !== 'string' || !Object.hasOwn(VOICES, voice)) {
    return sendError(res, 400, 'INVALID_VOICE', 'Choose voice "female" or "male".');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('AI speech provider is not configured.');
    return sendError(res, 503, 'PROVIDER_NOT_CONFIGURED', 'The speech service is not configured.');
  }

  const authorization = await authorizeAiRequest(req, 'speech');
  if (authorization.error) {
    return sendError(
      res,
      authorization.error.status,
      authorization.error.code,
      authorization.error.message
        || (authorization.error.code === 'DAILY_LIMIT_REACHED'
          ? 'Daily speech limit reached.'
          : 'Sign in is required or the speech service is temporarily unavailable.'),
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SPEECH_TIMEOUT_MS);
  let headersSent = false;
  try {
    const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
        voice: VOICES[voice],
        input: text.trim(),
        response_format: 'mp3',
        instructions: 'Speak naturally and clearly, with a warm conversational tone. Match the language of the text.',
      }),
      signal: controller.signal,
    });

    if (!upstream.ok || !upstream.body) {
      console.error('AI speech provider request failed:', { status: upstream.status });
      return sendError(res, 502, 'SPEECH_REQUEST_FAILED', 'The speech service could not complete the request.');
    }

    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'inline; filename="dbsignal-response.mp3"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    headersSent = true;
    res.flushHeaders?.();

    for await (const chunk of upstream.body) {
      if (!res.write(chunk)) {
        await new Promise((resolve) => res.once('drain', resolve));
      }
    }
    res.end();
  } catch (error) {
    console.error('AI speech request failed:', error instanceof Error ? error.message : 'Unknown speech error');
    if (headersSent) {
      res.destroy(error instanceof Error ? error : undefined);
    } else {
      sendError(res, 502, 'SPEECH_UNAVAILABLE', 'The speech service is temporarily unavailable.');
    }
  } finally {
    clearTimeout(timeout);
  }
}
