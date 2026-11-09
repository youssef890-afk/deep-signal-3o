import { createClient } from '@supabase/supabase-js';

export async function authorizeAiRequest(req, quotaMode) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('AI API authentication is not configured.');
    return {
      error: {
        status: 500,
        code: 'SUPABASE_NOT_CONFIGURED',
        message: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY on the server.',
      },
    };
  }

  const authorization = req.headers.authorization;
  const tokenMatch = typeof authorization === 'string'
    ? authorization.match(/^Bearer\s+(.+)$/i)
    : null;
  const accessToken = tokenMatch?.[1].trim();
  if (!accessToken) {
    return { error: { status: 401, code: 'AUTH_REQUIRED' } };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  try {
    const { data: userData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !userData.user) {
      return { error: { status: 401, code: 'AUTH_REQUIRED' } };
    }

    const { data: quotaAllowed, error: quotaError } = await supabase.rpc(
      'consume_jokal_ai_quota',
      { p_mode: quotaMode },
    );
    if (quotaError) {
      console.error('AI API quota check failed.');
      return { error: { status: 503, code: 'QUOTA_UNAVAILABLE' } };
    }
    if (quotaAllowed !== true) {
      return { error: { status: 429, code: 'DAILY_LIMIT_REACHED' } };
    }

    return { supabase, userId: userData.user.id };
  } catch {
    console.error('AI API authentication or quota request failed.');
    return { error: { status: 503, code: 'AUTH_OR_QUOTA_UNAVAILABLE' } };
  }
}
