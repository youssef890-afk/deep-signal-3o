import { createClient } from 'npm:@supabase/supabase-js@2';

const FREE_GENERATIONS = 2;
const SECOND_GENERATION_DELAY_DAYS = 7;
const MAX_REFERENCE_BYTES = 3 * 1024 * 1024;
const AVATAR_BUCKET = 'avatars';
const TEMP_BUCKET = 'avatar-temp';

const OPTIONS = {
  hairStyle: {
    short: 'short neat hair',
    curly: 'curly hair',
    wavy: 'wavy hair',
    long: 'long hair',
    bun: 'hair in a bun',
    bald: 'bald head',
  },
  hairColor: {
    black: 'black hair',
    brown: 'brown hair',
    blonde: 'blonde hair',
    red: 'red hair',
    silver: 'silver hair',
    blue: 'blue hair',
  },
  beard: {
    none: 'clean shaven',
    stubble: 'light stubble',
    short: 'short tidy beard',
    full: 'full neat beard',
    mustache: 'neat mustache',
  },
  eyes: {
    brown: 'warm brown eyes',
    green: 'green eyes',
    blue: 'blue eyes',
    hazel: 'hazel eyes',
    dark: 'dark eyes',
  },
  eyebrows: {
    natural: 'natural eyebrows',
    bold: 'bold eyebrows',
    arched: 'softly arched eyebrows',
    thin: 'thin eyebrows',
  },
  mouth: {
    smile: 'friendly smile',
    calm: 'calm expression',
    laugh: 'joyful laughing expression',
    confident: 'confident expression',
  },
  nose: {
    natural: 'natural proportions',
    small: 'small nose',
    broad: 'broad nose',
    defined: 'defined nose',
  },
  teeth: {
    natural: 'natural teeth',
    bright: 'bright natural teeth',
    hidden: 'closed-mouth expression',
  },
  skinTone: {
    dark: 'deep dark skin tone',
    brown: 'rich brown skin tone',
    tan: 'warm tan skin tone',
    golden: 'golden olive skin tone',
    light: 'light skin tone',
    fair: 'fair skin tone',
  },
  clothing: {
    casual: 'modern casual clothing',
    formal: 'elegant formal clothing',
    traditional: 'tasteful traditional clothing',
    sporty: 'clean sporty clothing',
    creative: 'artistic creative clothing',
    futuristic: 'subtle futuristic clothing',
  },
  accessories: {
    none: 'no accessories',
    glasses: 'stylish glasses',
    earrings: 'subtle earrings',
    headphones: 'modern headphones',
    hat: 'tasteful hat',
    scarf: 'elegant scarf',
  },
  background: {
    emerald: 'soft emerald studio background',
    night: 'deep midnight studio background',
    warm: 'warm sunset studio background',
    sky: 'soft sky-blue studio background',
    neutral: 'clean neutral studio background',
    abstract: 'subtle abstract studio background',
  },
} as const;

type AvatarOptions = {
  [Key in keyof typeof OPTIONS]: keyof (typeof OPTIONS)[Key];
};

const EMOJIS = ['😊', '😎', '🦊', '🐼', '🦁', '🌟', '🎨', '🚀', '🌿', '🐯'] as const;
type ProfileRow = {
  id: string;
  avatar_generations_used: number;
  last_avatar_generated_at: string | null;
  onboarding_completed: boolean;
};

function originHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') ?? '';
  const configured = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const allowOrigin = configured.length === 0
    ? '*'
    : configured.includes(origin) ? origin : configured[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function isAvatarOptions(value: unknown): value is AvatarOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const options = value as Record<string, unknown>;
  const keys = Object.keys(OPTIONS) as Array<keyof typeof OPTIONS>;
  return Object.keys(options).length === keys.length && keys.every((key) => {
    const choice = options[key];
    return typeof choice === 'string' && Object.prototype.hasOwnProperty.call(OPTIONS[key], choice);
  });
}

function buildPrompt(options: AvatarOptions, hasReference: boolean): string {
  const selected = (Object.keys(OPTIONS) as Array<keyof typeof OPTIONS>)
    .map((group) => (OPTIONS[group] as Record<string, string>)[options[group] as string])
    .join(', ');
  const identity = hasReference
    ? 'Use the supplied face photo only as a visual reference for the same person. Preserve their recognizable facial identity while making a polished illustrated avatar.'
    : 'Create an original friendly person portrait; do not imitate or depict a real person.';
  return [
    'Create a polished, friendly, animated-looking square profile avatar for a community platform.',
    identity,
    `Appearance: ${selected}.`,
    'Centered head and shoulders, clear complete face, expressive natural eyes, clean high-quality digital illustration, tasteful soft light, subtle emerald accents.',
    'No text, letters, logos, watermark, extra faces, collage, or photorealistic manipulation.',
  ].join(' ');
}

function canGenerateAvatar(profile: ProfileRow, now = Date.now()) {
  if (profile.avatar_generations_used >= FREE_GENERATIONS) {
    return { allowed: false, reason: 'payment_required' as const };
  }
  if (profile.avatar_generations_used === 1) {
    const firstGeneratedAt = profile.last_avatar_generated_at
      ? Date.parse(profile.last_avatar_generated_at)
      : Number.NaN;
    const nextAvailableAt = firstGeneratedAt + SECOND_GENERATION_DELAY_DAYS * 24 * 60 * 60 * 1000;
    if (!Number.isFinite(firstGeneratedAt) || nextAvailableAt > now) {
      return {
        allowed: false,
        reason: 'cooldown' as const,
        availableAt: Number.isFinite(nextAvailableAt) ? new Date(nextAvailableAt).toISOString() : null,
      };
    }
  }
  return { allowed: true as const };
}

function emojiAvatarUrl(emoji: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="128" fill="#10251e"/><text x="128" y="168" text-anchor="middle" font-size="136">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function generatedAvatarPath(url: string | null, userId: string, supabaseUrl: string) {
  if (!url) return null;
  const prefix = `${new URL(supabaseUrl).origin}/storage/v1/object/public/${AVATAR_BUCKET}/`;
  if (!url.startsWith(prefix)) return null;
  try {
    const path = decodeURIComponent(url.slice(prefix.length));
    return path.startsWith(`${userId}/generated-`) && !path.includes('..') ? path : null;
  } catch {
    return null;
  }
}

Deno.serve(async (request) => {
  const headers = originHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers);

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authorization || !supabaseUrl || !anonKey) {
    return json({ error: 'Authentication required' }, 401, headers);
  }
  if (!serviceRoleKey) return json({ error: 'Avatar service is not configured' }, 503, headers);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: 'Authentication required' }, 401, headers);

  let body: {
    action?: unknown;
    options?: unknown;
    referencePath?: unknown;
    avatarPath?: unknown;
    emoji?: unknown;
  };
  try {
    const requestBody: unknown = await request.json();
    if (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody)) {
      return json({ error: 'Invalid request' }, 400, headers);
    }
    body = requestBody as typeof body;
  } catch {
    return json({ error: 'Invalid request' }, 400, headers);
  }

  const userId = authData.user.id;
  if (body.action === 'complete') {
    if (typeof body.emoji === 'string' && (EMOJIS as readonly string[]).includes(body.emoji)) {
      const { data: currentProfile, error: currentProfileError } = await admin.from('profiles')
        .select('pending_avatar_url')
        .eq('id', userId)
        .maybeSingle();
      if (currentProfileError || !currentProfile) {
        console.error('Could not load pending avatar before emoji selection:', currentProfileError);
        return json({ error: 'Could not complete avatar setup' }, 500, headers);
      }
      const { data, error } = await admin.from('profiles').update({
        avatar_url: emojiAvatarUrl(body.emoji),
        avatar_type: 'emoji',
        avatar_emoji: body.emoji,
        pending_avatar_url: null,
        onboarding_completed: true,
      }).eq('id', userId).select('id').maybeSingle();
      if (error || !data) {
        console.error('Could not save emoji avatar onboarding:', error);
        return json({ error: 'Could not complete avatar setup' }, 500, headers);
      }
      const pendingPath = generatedAvatarPath(currentProfile.pending_avatar_url, userId, supabaseUrl);
      if (pendingPath) {
        const { error: cleanupError } = await admin.storage.from(AVATAR_BUCKET).remove([pendingPath]);
        if (cleanupError) console.error('Pending generated avatar cleanup failed:', cleanupError);
      }
      return json({ completed: true }, 200, headers);
    }

    if (typeof body.avatarPath !== 'string'
      || !body.avatarPath.startsWith(`${userId}/generated-`)
      || body.avatarPath.includes('..')) {
      return json({ error: 'Choose a generated avatar or an available emoji' }, 400, headers);
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('avatar_generations_used, pending_avatar_url, onboarding_completed')
      .eq('id', userId)
      .maybeSingle();
    if (profileError || !profile || profile.avatar_generations_used < 1) {
      console.error('Generated avatar confirmation failed:', profileError);
      return json({ error: 'Generated avatar is unavailable' }, 400, headers);
    }

    const { data: publicUrl } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(body.avatarPath);
    if (!profile.onboarding_completed && profile.pending_avatar_url !== publicUrl.publicUrl) {
      return json({ error: 'Generated avatar is unavailable' }, 400, headers);
    }

    const { data: avatarFile, error: fileError } = await admin.storage
      .from(AVATAR_BUCKET)
      .download(body.avatarPath);
    if (fileError || !avatarFile) {
      console.error('Generated avatar file could not be verified:', fileError);
      return json({ error: 'Generated avatar is unavailable' }, 400, headers);
    }

    const { data: updatedProfile, error } = await admin.from('profiles').update({
      avatar_url: publicUrl.publicUrl,
      avatar_type: 'generated',
      avatar_emoji: null,
      pending_avatar_url: null,
      onboarding_completed: true,
    }).eq('id', userId).select('id').maybeSingle();
    if (error || !updatedProfile) {
      console.error('Could not save generated avatar onboarding:', error);
      return json({ error: 'Could not complete avatar setup' }, 500, headers);
    }
    return json({ completed: true }, 200, headers);
  }

  if (body.action !== 'generate' || !isAvatarOptions(body.options)) {
    return json({ error: 'Invalid avatar choices' }, 400, headers);
  }

  let reference: Blob | null = null;
  if (body.referencePath !== undefined && body.referencePath !== null) {
    if (typeof body.referencePath !== 'string'
      || !body.referencePath.startsWith(`${userId}/`)
      || body.referencePath.includes('..')) {
      return json({ error: 'Invalid reference photo' }, 400, headers);
    }
    const { data, error } = await admin.storage.from(TEMP_BUCKET).download(body.referencePath);
    if (error || !data || data.size > MAX_REFERENCE_BYTES
      || !['image/jpeg', 'image/png', 'image/webp'].includes(data.type)) {
      console.error('Avatar reference photo could not be loaded:', error);
      return json({ error: 'Reference photo is unavailable' }, 400, headers);
    }
    reference = data;
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, avatar_generations_used, last_avatar_generated_at, onboarding_completed, pending_avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (profileError || !profile) {
    console.error('Avatar generation profile lookup failed:', profileError);
    return json({ error: 'Could not check avatar availability' }, 500, headers);
  }

  const availability = canGenerateAvatar(profile as ProfileRow);
  if (!availability.allowed) {
    return json({
      error: availability.reason,
      reason: availability.reason,
      ...(availability.reason === 'cooldown' ? { availableAt: availability.availableAt } : {}),
    }, availability.reason === 'payment_required' ? 402 : 429, headers);
  }

  const apiKey = Deno.env.get('AVATAR_IMAGE_API_KEY');
  const model = Deno.env.get('AVATAR_IMAGE_MODEL') ?? 'gemini-2.5-flash-image';
  if (!apiKey) return json({ error: 'Avatar service is not configured' }, 503, headers);

  const providerUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const parts: Array<Record<string, unknown>> = [
    { text: buildPrompt(body.options, Boolean(reference)) },
  ];
  if (reference) {
    const bytes = new Uint8Array(await reference.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    parts.push({
      inlineData: {
        mimeType: reference.type,
        data: btoa(binary),
      },
    });
  }

  let imageBytes: Uint8Array;
  let imageContentType = 'image/png';
  try {
    const response = await fetch(providerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('Avatar provider request failed:', response.status);
      return json({ error: 'Avatar generation failed' }, 502, headers);
    }
    const responseParts = result?.candidates?.flatMap(
      (candidate: { content?: { parts?: unknown[] } }) => candidate.content?.parts ?? []
    ) ?? [];
    const imagePart = responseParts.find((part: {
      inlineData?: { data?: unknown; mimeType?: unknown };
      inline_data?: { data?: unknown; mime_type?: unknown };
    }) => {
      const inlineData = part.inlineData ?? part.inline_data;
      return typeof inlineData?.data === 'string';
    }) as {
      inlineData?: { data?: string; mimeType?: string };
      inline_data?: { data?: string; mime_type?: string };
    } | undefined;
    const inlineData = imagePart?.inlineData ?? imagePart?.inline_data;
    const encoded = inlineData?.data;
    if (typeof encoded !== 'string') {
      console.error('Avatar provider returned no image data');
      return json({ error: 'Avatar generation failed' }, 502, headers);
    }
    imageContentType = inlineData?.mimeType ?? imagePart?.inline_data?.mime_type ?? 'image/png';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(imageContentType)) {
      console.error('Avatar provider returned an unsupported image content type');
      return json({ error: 'Avatar generation failed' }, 502, headers);
    }
    const binary = atob(encoded);
    if (binary.length < 16 || binary.length > 8 * 1024 * 1024) {
      return json({ error: 'Avatar generation failed' }, 502, headers);
    }
    imageBytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const validImage = imageContentType === 'image/png'
      ? imageBytes[0] === 137 && imageBytes[1] === 80 && imageBytes[2] === 78 && imageBytes[3] === 71
        && imageBytes[4] === 13 && imageBytes[5] === 10 && imageBytes[6] === 26 && imageBytes[7] === 10
      : imageContentType === 'image/jpeg'
        ? imageBytes[0] === 255 && imageBytes[1] === 216 && imageBytes[2] === 255
        : imageBytes[0] === 82 && imageBytes[1] === 73 && imageBytes[2] === 70 && imageBytes[3] === 70
          && imageBytes[8] === 87 && imageBytes[9] === 69 && imageBytes[10] === 66 && imageBytes[11] === 80;
    if (!validImage) {
      console.error('Avatar provider returned an unsupported image format');
      return json({ error: 'Avatar generation failed' }, 502, headers);
    }
  } catch (error) {
    console.error('Avatar provider request failed:', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'Avatar generation failed' }, 502, headers);
  }

  const imageExtension = imageContentType === 'image/jpeg' ? 'jpg' : imageContentType === 'image/webp' ? 'webp' : 'png';
  const avatarPath = `${userId}/generated-${crypto.randomUUID()}.${imageExtension}`;
  const { error: uploadError } = await admin.storage.from(AVATAR_BUCKET).upload(
    avatarPath,
    new Blob([imageBytes], { type: imageContentType }),
    { contentType: imageContentType, cacheControl: '3600', upsert: false },
  );
  if (uploadError) {
    console.error('Generated avatar could not be stored:', uploadError);
    return json({ error: 'Avatar could not be saved' }, 500, headers);
  }

  const { data: publicUrl } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath);
  if (typeof body.referencePath === 'string') {
    let removed = false;
    for (let attempt = 0; attempt < 3 && !removed; attempt++) {
      const { error } = await admin.storage.from(TEMP_BUCKET).remove([body.referencePath]);
      if (!error) {
        removed = true;
      } else {
        console.error(`Used reference photo cleanup attempt ${attempt + 1} failed:`, error);
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
    if (!removed) {
      const { error } = await admin.storage.from(AVATAR_BUCKET).remove([avatarPath]);
      if (error) console.error('Avatar could not be removed after reference cleanup failure:', error);
      return json({ error: 'Reference photo cleanup failed' }, 500, headers);
    }
  }

  const { data: consumed, error: consumeError } = await admin.rpc('consume_avatar_generation', {
    target_user_id: userId,
    generated_avatar_url: publicUrl.publicUrl,
  });
  if (consumeError || !consumed?.allowed) {
    const { error: cleanupError } = await admin.storage.from(AVATAR_BUCKET).remove([avatarPath]);
    if (cleanupError) console.error('Unused generated avatar could not be removed:', cleanupError);
    const reason = consumed?.reason === 'cooldown' || consumed?.reason === 'payment_required'
      ? consumed.reason
      : 'generation_unavailable';
    return json({ error: reason, reason, availableAt: consumed?.available_at ?? null }, reason === 'payment_required' ? 402 : 429, headers);
  }

  const previousPendingPath = generatedAvatarPath(profile.pending_avatar_url, userId, supabaseUrl);
  if (previousPendingPath && previousPendingPath !== avatarPath) {
    const { error } = await admin.storage.from(AVATAR_BUCKET).remove([previousPendingPath]);
    if (error) console.error('Previous pending generated avatar cleanup failed:', error);
  }

  return json({ avatarPath, avatarUrl: publicUrl.publicUrl }, 200, headers);
});
