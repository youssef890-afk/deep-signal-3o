import { mkdir, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(ROOT, 'voice-samples');
const DAILY_USAGE_PATH = path.join(OUTPUT_DIR, '.daily-usage.json');
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const REQUEST_GAP_MS = 8_000;
const DAILY_GENERATION_LIMIT = 8;
const SAMPLE_RATE_DEFAULT = 24_000;
const CHANNELS_DEFAULT = 1;
const BITS_PER_SAMPLE = 16;

export const VOICES = [
  'Achird',
  'Sulafat',
  'Charon',
  'Kore',
  'Puck',
  'Zephyr',
  'Fenrir',
  'Aoede',
];

export const LANGUAGES = {
  ar: {
    name: 'العربية',
    text: 'مرحباً بك! أنا مساعدك.',
  },
  fr: {
    name: 'Français',
    text: 'Bienvenue ! Je suis votre assistant.',
  },
  en: {
    name: 'English',
    text: 'Welcome! I am your assistant.',
  },
};

function nodeSupportsEnvFile(version = process.versions.node) {
  const [major, minor] = version.split('.').map(Number);
  return major > 20 || (major === 20 && minor >= 6);
}

function languageSelection(value) {
  const requested = (value || 'ar,en').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  const unique = [...new Set(requested)];
  const unsupported = unique.filter((language) => !Object.hasOwn(LANGUAGES, language));
  if (unsupported.length) {
    throw new Error(`قيم LANGS غير مدعومة: ${unsupported.join(', ')}. القيم المسموحة: ar, fr, en.`);
  }
  const order = ['ar', 'en', 'fr'];
  return unique.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function modelName(model) {
  return typeof model?.name === 'string' ? model.name.replace(/^models\//, '') : '';
}

export function chooseTtsModel(models, override = '') {
  const usable = models.filter((model) => {
    const name = modelName(model).toLowerCase();
    const methods = model.supportedGenerationMethods ?? model.supported_generation_methods ?? [];
    return name.includes('tts')
      && name.includes('flash')
      && name.includes('lite')
      && !name.includes('pro')
      && !name.includes('argon')
      && (!methods.length || methods.includes('interactions') || methods.includes('generateContent'));
  });

  if (override) {
    const wanted = override.replace(/^models\//, '').toLowerCase();
    return usable.find((model) => modelName(model).toLowerCase() === wanted);
  }

  return usable[0];
}

function wavDurationSeconds(wav) {
  if (wav.length < 44) return 0;
  if (wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') return 0;
  const byteRate = wav.readUInt32LE(28);
  for (let offset = 12; offset + 8 <= wav.length;) {
    const chunkName = wav.toString('ascii', offset, offset + 4);
    const chunkSize = wav.readUInt32LE(offset + 4);
    if (chunkName === 'data') return byteRate ? chunkSize / byteRate : 0;
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return 0;
}

export function pcmToWav(pcm, {
  sampleRate = SAMPLE_RATE_DEFAULT,
  channels = CHANNELS_DEFAULT,
  bitsPerSample = BITS_PER_SAMPLE,
} = {}) {
  if (!Buffer.isBuffer(pcm) || pcm.length === 0) throw new Error('بيانات PCM فارغة أو غير صالحة.');
  if (pcm.length % (channels * bitsPerSample / 8) !== 0) {
    throw new Error('طول بيانات PCM لا يتوافق مع صيغة الصوت.');
  }

  const header = Buffer.alloc(44);
  const blockAlign = channels * bitsPerSample / 8;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export function getAudioPart(response) {
  const outputAudio = response?.output_audio ?? response?.outputAudio;
  if (typeof outputAudio?.data === 'string' && outputAudio.data.length) {
    return {
      data: outputAudio.data,
      mimeType: outputAudio.mime_type ?? outputAudio.mimeType ?? 'audio/wav',
    };
  }

  const candidates = response?.candidates ?? [];
  for (const candidate of candidates) {
    for (const part of candidate?.content?.parts ?? []) {
      const data = part.inlineData?.data ?? part.inline_data?.data;
      const mimeType = part.inlineData?.mimeType ?? part.inline_data?.mime_type ?? '';
      if (typeof data === 'string' && data.length) return { data, mimeType };
    }
  }
  throw new Error('لم تتضمن استجابة Gemini بيانات صوتية.');
}

export function audioToWav({ data, mimeType = '' }) {
  const audio = Buffer.from(data, 'base64');
  if (!audio.length) throw new Error('استجابة الصوت فارغة.');
  if (audio.toString('ascii', 0, 4) === 'RIFF' && audio.toString('ascii', 8, 12) === 'WAVE') {
    return { wav: audio, durationSeconds: wavDurationSeconds(audio) };
  }

  const mime = mimeType.toLowerCase();
  if (!mime.includes('pcm') && !mime.includes('l16')) {
    throw new Error(`صيغة الصوت غير مدعومة للتحويل إلى WAV: ${mimeType || 'غير معروفة'}.`);
  }
  const rate = Number(mime.match(/(?:rate|samplerate)=(\d+)/)?.[1]) || SAMPLE_RATE_DEFAULT;
  const channels = Number(mime.match(/channels?=(\d+)/)?.[1]) || CHANNELS_DEFAULT;
  const wav = pcmToWav(audio, { sampleRate: rate, channels });
  return { wav, durationSeconds: wavDurationSeconds(wav) };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export function buildIndexHtml(languages, voices, samples) {
  const sections = languages.map((language) => {
    const voiceRows = voices.map((voice) => {
      const sample = samples.get(`${language}:${voice}`);
      const audio = sample
        ? `<p class="status ready">جاهزة</p><audio controls preload="none" src="./${language}/${voice}.wav"></audio><small>${sample.durationSeconds.toFixed(2)} ث</small>`
        : '<p class="status pending">قيد الانتظار</p>';
      return `<article><h3>${escapeHtml(voice)}</h3>${audio}</article>`;
    }).join('\n');

    return `<section lang="${language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}"><h2>${escapeHtml(LANGUAGES[language].name)}</h2><p class="transcript">${escapeHtml(LANGUAGES[language].text)}</p><div class="voices">${voiceRows}</div></section>`;
  }).join('\n');

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>عينات أصوات Gemini</title>
  <style>
    :root{color-scheme:dark;font-family:system-ui,"Segoe UI",sans-serif;background:#151515;color:#f4f1eb}
    body{max-width:980px;margin:0 auto;padding:24px}
    h1{color:#f4f1eb} section{margin:24px 0;padding:20px;border:1px solid #ffffff20;border-radius:18px;background:#222220}
    .transcript{color:#d5d1c9;line-height:1.8}.voices{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
    article{padding:14px;border:1px solid #ffffff18;border-radius:12px;background:#191918}h3{margin:0 0 10px}
    audio{display:block;width:100%}.status{display:inline-block;margin:0 0 10px;padding:4px 9px;border-radius:999px;font-size:.85rem}
    .ready{color:#c8f2d3;background:#1e4930}.pending{color:#ded6c8;background:#3a342b}
    small{display:block;margin-top:8px;color:#c4beb3}
  </style>
</head>
<body>
  <h1>عينات أصوات Gemini</h1>
  <p>استمع إلى الصوت نفسه لكل خيار، ثم اختر ما يناسبك.</p>
  ${sections}
</body>
</html>`;
}

function apiErrorMessage(status) {
  if (status === 401 || status === 403) return 'تحقق من صلاحية المفتاح وإتاحة هذا النموذج للمشروع.';
  if (status === 404) return 'النموذج أو واجهة الطلب غير متاحين لهذا المفتاح.';
  if (status === 429) return 'تم بلوغ حد الطلبات؛ لن يعيد السكربت المحاولة.';
  if (status >= 500) return 'خدمة Gemini غير متاحة مؤقتاً.';
  return 'رفضت واجهة Gemini الطلب؛ راجع إعداد النموذج واللغة.';
}

async function responseErrorMessage(response, apiKey) {
  let responseText = '';
  try {
    responseText = await response.text();
  } catch {
    return `HTTP ${response.status}: ${apiErrorMessage(response.status)}`;
  }

  let message = '';
  try {
    const body = JSON.parse(responseText);
    message = body?.error?.message ?? body?.message ?? '';
  } catch {
    message = responseText.slice(0, 500);
  }

  const sanitized = String(message)
    .replaceAll(apiKey, '[REDACTED]')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]')
    .trim();
  return `HTTP ${response.status}: ${sanitized || apiErrorMessage(response.status)}`;
}

async function requestJson(url, options, stats, isGeneration = false) {
  if (stats.lastRequestAt !== null) {
    const elapsed = Date.now() - stats.lastRequestAt;
    if (elapsed < REQUEST_GAP_MS) await sleep(REQUEST_GAP_MS - elapsed);
  }
  stats.lastRequestAt = Date.now();
  stats.totalRequests += 1;
  if (isGeneration) stats.generationRequests += 1;

  let response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(90_000) });
  } catch {
    throw new Error('تعذر الاتصال بواجهة Gemini API (خطأ شبكة).');
  }

  if (!response.ok) {
    const apiKey = options.headers?.['x-goog-api-key'] ?? '';
    throw new Error(await responseErrorMessage(response, apiKey));
  }

  try {
    return await response.json();
  } catch {
    throw new Error('استجابة Gemini API ليست JSON صالحاً.');
  }
}

export function quotaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function validateUsageState(value) {
  if (
    !value
    || value.version !== 1
    || typeof value.quotaDate !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(value.quotaDate)
    || !Number.isInteger(value.generationRequests)
    || value.generationRequests < 0
    || value.generationRequests > DAILY_GENERATION_LIMIT
  ) {
    throw new Error('ملف عداد الاستخدام اليومي تالف أو بإصدار غير معروف؛ لم أغيّره.');
  }
  return value;
}

export async function readDailyUsage(filePath = DAILY_USAGE_PATH, date = quotaDateKey()) {
  let content;
  try {
    content = await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return { version: 1, quotaDate: date, generationRequests: 0 };
    throw error;
  }

  let state;
  try {
    state = validateUsageState(JSON.parse(content));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('ملف عداد الاستخدام اليومي ليس JSON صالحاً؛ لم أغيّره.');
    }
    throw error;
  }

  return state.quotaDate === date
    ? state
    : { version: 1, quotaDate: date, generationRequests: 0 };
}

export async function reserveDailyRequest(filePath = DAILY_USAGE_PATH, date = quotaDateKey()) {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
  const lockPath = `${filePath}.lock`;
  let lock;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    try {
      lock = await open(lockPath, 'wx');
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      await sleep(100);
    }
  }
  if (!lock) throw new Error('تعذر الحصول على قفل عداد الاستخدام؛ لم يُرسل طلب.');

  try {
    const state = await readDailyUsage(filePath, date);
    if (state.generationRequests >= DAILY_GENERATION_LIMIT) {
      return { state, reserved: false };
    }

    const next = { ...state, generationRequests: state.generationRequests + 1 };
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, filePath);
    return { state: next, reserved: true };
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}

async function loadExistingSamples(languages, voices) {
  const samples = new Map();
  const existingFiles = new Set();
  for (const language of languages) {
    for (const voice of voices) {
      const key = `${language}:${voice}`;
      const file = path.join(OUTPUT_DIR, language, `${voice}.wav`);
      try {
        const wav = await readFile(file);
        existingFiles.add(key);
        if (wavDurationSeconds(wav) > 0) {
          samples.set(key, { durationSeconds: wavDurationSeconds(wav) });
        } else {
          console.error(`${language}/${voice}.wav موجود لكنه ليس WAV صالحاً؛ تم تجاوزه دون استبداله.`);
        }
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }
  return { samples, existingFiles };
}

async function writeIndex(languages, voices, samples) {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(
    path.join(OUTPUT_DIR, 'index.html'),
    buildIndexHtml(languages, voices, samples),
    'utf8',
  );
}

async function listModels(apiKey, stats) {
  const models = [];
  let pageToken = '';
  do {
    const url = new URL(`${API_BASE}/models`);
    url.searchParams.set('pageSize', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const result = await requestJson(url, {
      headers: { 'x-goog-api-key': apiKey },
    }, stats);
    models.push(...(result.models ?? []));
    pageToken = result.nextPageToken ?? '';
  } while (pageToken);
  return models;
}

export function generationBody(model, text, voice) {
  return {
    model,
    input: [{
      type: 'user_input',
      content: [{
        type: 'text',
        text,
        annotations: [{
          type: 'speech_metadata',
          style: 'warm and friendly',
        }],
      }],
    }],
    response_format: { type: 'audio' },
    generation_config: {
      speech_config: [{ voice }],
    },
  };
}

async function generateSample({ apiKey, model, language, voice, stats }) {
  const url = `${API_BASE}/interactions`;
  const response = await requestJson(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(generationBody(model, LANGUAGES[language].text, voice)),
  }, stats, true);
  const { wav, durationSeconds } = audioToWav(getAudioPart(response));
  const directory = path.join(OUTPUT_DIR, language);
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, `${voice}.wav`);
  await writeFile(file, wav, { flag: 'wx' });
  return { durationSeconds, file };
}

async function main() {
  if (!nodeSupportsEnvFile()) {
    console.error('إصدار Node.js قديم. استخدم Node.js 20.6 أو أحدث لتشغيل --env-file.');
    process.exitCode = 1;
    return;
  }

  let languages;
  try {
    languages = languageSelection(process.env.LANGS);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  const quotaDate = quotaDateKey();
  let samples;
  let existingFiles;
  let dailyUsage;
  try {
    await mkdir(OUTPUT_DIR, { recursive: true });
    ({ samples, existingFiles } = await loadExistingSamples(languages, VOICES));
    dailyUsage = await readDailyUsage(DAILY_USAGE_PATH, quotaDate);
  } catch (error) {
    console.error(`تعذر قراءة حالة العينات أو عداد الاستخدام: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  if (dailyUsage.generationRequests >= DAILY_GENERATION_LIMIT) {
    await writeIndex(languages, VOICES, samples);
    console.log(`بلغت حد ${DAILY_GENERATION_LIMIT} طلبات توليد لهذا اليوم (${quotaDate} بتوقيت المحيط الهادئ).`);
    console.log(`الفهرس المحدّث: ${path.join(OUTPUT_DIR, 'index.html')}`);
    return;
  }

  if (languages.every((language) => VOICES.every((voice) => samples.has(`${language}:${voice}`)))) {
    await writeIndex(languages, VOICES, samples);
    console.log('كل العينات المطلوبة جاهزة؛ لم يتم إرسال أي طلب API.');
    console.log(`الفهرس: ${path.join(OUTPUT_DIR, 'index.html')}`);
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error('لم أجد GEMINI_API_KEY. ضع المفتاح محلياً في .env ثم أعد تشغيل الأمر؛ لن أطلبه أو أطبع قيمته.');
    process.exitCode = 1;
    return;
  }

  const stats = { totalRequests: 0, generationRequests: 0, lastRequestAt: null };
  let models;
  try {
    models = await listModels(apiKey, stats);
  } catch (error) {
    console.error(`تعذر اكتشاف نماذج الصوت: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const override = process.env.GEMINI_TTS_MODEL?.trim() ?? '';
  const model = chooseTtsModel(models, override);
  if (!model) {
    if (override) {
      console.error('النموذج المحدد غير متاح أو ليس نموذج Flash TTS مدعوماً لهذا المفتاح.');
    } else {
      console.error('لم يظهر أي نموذج Flash TTS متاح لهذا المفتاح. استخدم Piper محلياً لتوليد العينات دون واجهة مدفوعة.');
    }
    console.error(`طلبات اكتشاف النماذج: ${stats.totalRequests}. لم تُرسل طلبات توليد صوت.`);
    process.exitCode = 1;
    return;
  }

  const selectedModel = modelName(model);
  console.log(`نموذج الصوت: ${selectedModel}`);
  console.log(`اللغات المطلوبة: ${languages.join(', ')}`);

  const failures = [];
  let generationAttempts = 0;
  let rateLimited = false;

  generation: for (const language of languages) {
    if (
      language === 'en'
      && languages.includes('ar')
      && !VOICES.every((voice) => samples.has(`ar:${voice}`))
    ) {
      console.log('تأجلت الإنجليزية حتى تكتمل جميع العينات العربية.');
      break;
    }

    await mkdir(path.join(OUTPUT_DIR, language), { recursive: true });
    for (const voice of VOICES) {
      const key = `${language}:${voice}`;
      if (existingFiles.has(key)) {
        console.log(`موجودة مسبقاً، تم تجاوزها: ${language}/${voice}.wav`);
        continue;
      }

      if (dailyUsage.generationRequests >= DAILY_GENERATION_LIMIT) {
        console.log(`بلغ عداد اليوم ${DAILY_GENERATION_LIMIT} طلبات؛ ستُستأنف العينات المتبقية في يوم الحصة التالي.`);
        break generation;
      }

      let reservation;
      try {
        reservation = await reserveDailyRequest(DAILY_USAGE_PATH, quotaDate);
      } catch (error) {
        failures.push({ language, voice, error: error.message });
        console.error(`توقف قبل طلب ${language}/${voice}: ${error.message}`);
        break generation;
      }
      dailyUsage = reservation.state;
      if (!reservation.reserved) {
        console.log(`بلغ عداد اليوم ${DAILY_GENERATION_LIMIT} طلبات؛ ستُستأنف العينات المتبقية في يوم الحصة التالي.`);
        break generation;
      }

      generationAttempts += 1;
      try {
        const sample = await generateSample({ apiKey, model: selectedModel, language, voice, stats });
        samples.set(key, sample);
        existingFiles.add(key);
        console.log(`نجح: ${language}/${voice}.wav (${sample.durationSeconds.toFixed(2)} ث)`);
      } catch (error) {
        failures.push({ language, voice, error: error.message });
        console.error(`فشل ${language}/${voice} — ${error.message}`);
        if (error.message.startsWith('HTTP 429:')) {
          rateLimited = true;
          console.log('توقف التوليد بعد 429؛ لن تتم إعادة المحاولة أو إرسال طلبات أخرى في هذا التشغيل.');
          break generation;
        }
      }
    }
  }

  await writeIndex(languages, VOICES, samples);

  const ready = samples.size;
  const total = languages.length * VOICES.length;
  console.log('\nملخص العينات:');
  console.log(`جاهزة: ${ready}/${total}`);
  console.log(`طلبات توليد جديدة في هذا التشغيل: ${generationAttempts}`);
  console.log(`الحد اليومي المسجل: ${dailyUsage.generationRequests}/${DAILY_GENERATION_LIMIT} (${quotaDate}, بتوقيت المحيط الهادئ)`);
  console.log(`فشلت: ${failures.length}`);
  if (rateLimited) console.log('توقف هذا التشغيل بسبب حد API؛ بقية العينات ستظل قيد الانتظار.');
  console.log(`الفهرس: ${path.join(OUTPUT_DIR, 'index.html')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`توقف السكربت: ${error.message || 'خطأ غير متوقع.'}`);
    process.exitCode = 1;
  });
}
