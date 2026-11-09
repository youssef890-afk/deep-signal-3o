import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Search as SearchIcon, MessageSquare, Loader2 } from 'lucide-react';
import { formatDisplayId } from '@/utils/format';
import { getStoredLanguage, translate } from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';
import Handle from '@/components/Handle';

interface Profile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  display_id?: number;
}

/*
 * The search term is interpolated into a PostgREST `.or()` filter string, so any
 * character that has meaning in that grammar (comma, parentheses, quotes,
 * backslash, dots, percent) must be removed first. Without this, a crafted term
 * could inject additional filter conditions into the query.
 */
function sanitizeSearchTerm(value: string): string {
  return value
    .replace(/[,()*'"\\.%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

export default function SearchPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const navigate = useNavigate();
  const t = (key: 'searchPageTitle' | 'searchPlaceholder' | 'searchClear' | 'searchError' | 'searchNoResults' | 'directMessages') =>
    translate(getStoredLanguage(), key);

  useEffect(() => {
    let cancelled = false;

    async function fetchUsers() {
      const term = sanitizeSearchTerm(searchTerm);

      if (!term) {
        // جلب قائمة مقترحة عند فتح البحث بدون كتابة
        let query = supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, display_id');
        if (user?.id) query = query.neq('id', user.id);
        const { data } = await query.limit(10);
        if (cancelled) return;
        setResults((data as Profile[]) || []);
        return;
      }

      setLoading(true);
      setSearchError('');
      try {
        // `display_id` is an integer column, so an ILIKE on it would be a type
        // error. It is only matched exactly, and only when the term is numeric.
        const filters = [`username.ilike.%${term}%`, `full_name.ilike.%${term}%`];
        const formattedId = /^DS-(\d{1,9})#?$/i.exec(term);
        const numeric = formattedId
          ? Number(formattedId[1])
          : /^\d{1,9}$/.test(term) ? Number(term) : null;
        if (numeric !== null) filters.push(`display_id.eq.${numeric}`);

        let query = supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, display_id')
          .or(filters.join(','));
        if (user?.id) query = query.neq('id', user.id);
        const { data, error } = await query.limit(20);

        if (error) throw error;
        if (cancelled) return;
        setResults((data as Profile[]) || []);
      } catch (err) {
        if (!cancelled) {
          console.error('Error searching users:', err);
          setResults([]);
          setSearchError(translate(getStoredLanguage(), 'searchError'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timer = setTimeout(() => void fetchUsers(), 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, user?.id]);

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-28 text-white space-y-5">
      <h1 className="text-xl font-bold">{t('searchPageTitle')}</h1>

      {/* مربع البحث */}
      <div className="relative flex items-center">
        <SearchIcon className="absolute start-3 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl ps-9 pe-10 py-2.5 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            aria-label={t('searchClear')}
            className="absolute end-3 text-[var(--text-muted)] hover:text-[var(--text)] text-xs font-semibold"
          >
            {t('searchClear')}
          </button>
        )}
      </div>

      {/* قائمة النتائج */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
        </div>
      ) : (
        <div className="space-y-2">
          {searchError ? (
            <p role="alert" className="text-center text-xs text-[var(--error)] py-6">{searchError}</p>
          ) : results.length === 0 ? (
            <p className="text-center text-xs text-[var(--text-muted)] py-6">{t('searchNoResults')}</p>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/profile/${item.id}`)}
                className="bg-[var(--surface)] hover:bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={item.avatar_url} name={item.full_name || item.username} size="sm" />
                  <div>
                    <h3 className="text-xs font-bold text-white">
                      {item.full_name || item.username}
                    </h3>
                    <p className="text-[10px] text-neutral-400">
                      {formatDisplayId(item.display_id) || <Handle username={item.username} />}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/chat`);
                  }}
                  aria-label={t('directMessages')}
                  className="bg-[var(--surface-2)] hover:brightness-110 p-2 rounded-lg text-[var(--text-muted)] border border-[var(--border)]"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
