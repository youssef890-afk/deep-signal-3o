type SupabaseConfig =
  | { ready: true; url: string; anonKey: string }
  | { ready: false; missing: string[] };

export function readSupabaseConfig(): SupabaseConfig {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  const missing: string[] = [];

  if (!url || url === 'undefined') missing.push('VITE_SUPABASE_URL');
  if (!anonKey || anonKey === 'undefined') missing.push('VITE_SUPABASE_ANON_KEY');

  if (!url || url === 'undefined' || !anonKey || anonKey === 'undefined') {
    return { ready: false, missing };
  }

  return { ready: true, url, anonKey };
}
