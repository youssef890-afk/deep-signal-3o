import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { X, Loader2 } from 'lucide-react';
import { useModalScrollLock } from '@/hooks/useModalLayer';
import { directionForLanguage, getStoredLanguage, translate } from '@/lib/i18n';

interface EditProfileModalProps {
  profile: {
    id: string;
    username?: string;
    full_name?: string;
    bio?: string;
    avatar_url?: string;
  };
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditProfileModal({ profile, onClose, onUpdated }: EditProfileModalProps) {
  useModalScrollLock(true);
  const [username, setUsername] = useState(profile.username || '');
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [loading, onClose]);

  const handleSubmit = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        username: username.trim() || null,
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
      })
      .eq('id', profile.id);

    setLoading(false);

    if (error) {
      alert('Failed to update profile: ' + error.message);
      return;
    }

    onUpdated();
    onClose();
  };

  return createPortal(
    <div
      role="presentation"
      dir={directionForLanguage(getStoredLanguage())}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        className="relative flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-2xl animate-scale-in"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 id="edit-profile-title" className="text-lg font-semibold">Edit Profile</h2>
          <button type="button" aria-label={translate(getStoredLanguage(), 'closeDialog')} onClick={onClose} disabled={loading} className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-neutral-400 block mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-400 block mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-400 block mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 transition-all resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold py-3 rounded-xl hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
