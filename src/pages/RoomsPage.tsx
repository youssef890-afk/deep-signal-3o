import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowUpRight, Loader2, Mic2, Plus, Radio, Search, Users, X } from 'lucide-react';
import { useModalScrollLock } from '@/hooks/useModalLayer';
import { getStoredDirection } from '@/lib/i18n';
import Handle from '@/components/Handle';
import { useOnlineUsers } from '@/hooks/useOnlinePresence';

interface Room {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  capacity: number;
  invite_code: string;
  profiles: { username: string; avatar_url: string | null } | null;
  member_count: number;
}

const roomCapacities = [2, 4, 6, 8, 10];

export default function RoomsPage() {
  const { user } = useAuth();
  const { onlineIds } = useOnlineUsers();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [roomCapacity, setRoomCapacity] = useState(6);
  const [joinCode, setJoinCode] = useState('');
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [joinCodeError, setJoinCodeError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [nameError, setNameError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  useModalScrollLock(createOpen);

  useEffect(() => {
    if (!createOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !creating) setCreateOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [createOpen, creating]);

  const loadRooms = useCallback(async () => {
    if (!user) return;
    setLoadError('');
    const { data, error } = await supabase
      .from('rooms')
      .select('id, name, description, created_by, created_at, capacity, invite_code, profiles:created_by(username, avatar_url)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Could not load audio rooms:', error);
      setLoadError('تعذر تحميل الغرف الصوتية الآن. تحقق من اتصالك ثم أعد المحاولة.');
      setRooms([]);
      setLoading(false);
      return;
    }

    const roomIds = (data ?? []).map((room) => room.id);
    const { data: members, error: membersError } = roomIds.length
      ? await supabase.from('room_members').select('room_id').in('room_id', roomIds)
      : { data: [], error: null };

    if (membersError) {
      console.error('Could not load audio room member counts:', membersError);
      setLoadError('تعذر تحميل عدد المشاركين الآن. حاول مرة أخرى بعد قليل.');
      setRooms([]);
      setLoading(false);
      return;
    }

    const counts = new Map<string, number>();
    for (const member of members ?? []) {
      counts.set(member.room_id, (counts.get(member.room_id) ?? 0) + 1);
    }
    setRooms((data ?? []).map((room) => ({
      ...room,
      profiles: (Array.isArray(room.profiles) ? room.profiles[0] ?? null : room.profiles) as Room['profiles'],
      member_count: counts.get(room.id) ?? 0,
    })) as Room[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadRooms();
    const channel = supabase
      .channel('active-rooms-list', { config: { private: true } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => void loadRooms())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members' }, () => void loadRooms())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadRooms]);

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const cleanName = roomName.trim();
    const cleanDescription = description.trim();
    setNameError('');
    setDescriptionError('');
    setCreateError('');
    if (!cleanName) {
      setNameError('اسم الغرفة مطلوب.');
      return;
    }
    if (cleanName.length > 40) {
      setNameError('اسم الغرفة يجب ألا يتجاوز 40 حرف.');
      return;
    }
    if (cleanDescription && cleanDescription.length > 120) {
      setDescriptionError('الوصف يجب ألا يتجاوز 120 حرف.');
      return;
    }

    setCreating(true);
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        name: cleanName,
        description: cleanDescription || null,
        created_by: user.id,
        capacity: roomCapacity,
      })
      .select('id')
      .single();
    setCreating(false);
    if (error || !data) {
      setCreateError('ما قدرناش ننشئو الغرفة. حاول مرة أخرى.');
      return;
    }
    setCreateOpen(false);
    setRoomName('');
    setDescription('');
    setRoomCapacity(6);
    navigate(`/rooms/${data.id}`);
  }

  async function openRoomByCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!/^[A-F0-9]{12}$/.test(code)) {
      setJoinCodeError('دخل الرمز كامل من 12 حرف أو رقم.');
      return;
    }

    setJoiningByCode(true);
    setJoinCodeError('');
    const { data, error } = await supabase
      .from('rooms')
      .select('id')
      .eq('invite_code', code)
      .eq('is_active', true)
      .maybeSingle();
    setJoiningByCode(false);
    if (error || !data) {
      if (error) console.error('Could not find room by invite code:', error);
      setJoinCodeError('ما لقيناش غرفة نشيطة بهاد الرمز.');
      return;
    }
    navigate(`/rooms/${data.id}`);
  }

  const filteredRooms = rooms.filter((room) =>
    `${room.name} ${room.description ?? ''} ${room.profiles?.username ?? ''}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase())
  );

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] relative" dir="rtl">
      <div className="aurora" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        <header>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-7 flex items-center justify-between gap-4"
          >
            <div>
              <div className="mb-1 flex items-center gap-2 text-[var(--success)]">
                <Radio className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em]">مباشر الآن</span>
              </div>
              <h1 className="text-2xl font-bold text-white">الغرف الصوتية</h1>
              <p className="mt-1 text-xs text-white/45">جلسات حية ونقاشات مع المجتمع</p>
            </div>
            <button
              type="button"
              onClick={() => { setCreateOpen(true); setCreateError(''); }}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-3.5 py-2.5 text-xs font-bold text-[var(--accent-foreground)] transition hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              غرفة جديدة
            </button>
          </motion.div>
        </header>

        <label className="relative mb-5 block">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="قلب على غرفة أو موضوع..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 ps-10 pe-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[var(--accent)]/50"
          />
        </label>

        <form onSubmit={(event) => void openRoomByCode(event)} className="mb-5 flex gap-2">
          <input
            value={joinCode}
            onChange={(event) => { setJoinCode(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 12)); setJoinCodeError(''); }}
            maxLength={12}
            placeholder="دخل رمز الغرفة"
            aria-label="رمز الغرفة"
            className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-mono text-sm tracking-widest text-white outline-none placeholder:font-sans placeholder:text-xs placeholder:tracking-normal focus:border-[var(--accent)]/50"
          />
          <button type="submit" disabled={joiningByCode || joinCode.length !== 12} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-2.5 text-xs font-semibold text-[var(--accent)] disabled:opacity-45">
            {joiningByCode && <Loader2 className="h-4 w-4 animate-spin" />}
            دخول بالرمز
          </button>
        </form>
        {joinCodeError && <p role="alert" className="-mt-3 mb-4 text-xs text-[var(--error)]">{joinCodeError}</p>}

        {loading ? (
          <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" /></div>
        ) : loadError ? (
          <div role="alert" className="rounded-xl border border-[var(--error)]/20 bg-[var(--error)]/[0.06] p-5 text-center">
            <p className="text-sm text-[var(--error)]">{loadError}</p>
            <button type="button" onClick={() => void loadRooms()} className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white">إعادة المحاولة</button>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="border-y border-[var(--border)] py-14 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-[var(--accent)]/15 bg-[var(--accent)]/[0.06] text-[var(--accent)]">
              <Mic2 className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-white">{search ? 'ما لقيناش هاد الغرفة' : 'ما كايناش غرف مباشرة'}</h2>
            <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-white/45">{search ? 'جرب كلمة أخرى.' : 'بدا أول جلسة صوتية وخلي النقاش يبدا.'}</p>
            {!search && <button type="button" onClick={() => setCreateOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-xs font-bold text-[var(--accent-foreground)]"><Plus className="h-4 w-4" />إنشاء غرفة</button>}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredRooms.map((room, index) => (
              <motion.article
                key={room.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.035, 0.2) }}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 transition hover:border-[var(--accent)]/25 hover:bg-[var(--surface-2)]"
              >
                <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--surface-2)] text-sm font-bold text-white">
                  {room.profiles?.avatar_url ? <img src={room.profiles.avatar_url} alt="" className="h-full w-full object-cover" /> : (room.profiles?.username?.charAt(0) || 'غ').toUpperCase()}
                  <span className="absolute bottom-0.5 start-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] bg-[var(--success)]" />
                  {onlineIds.includes(room.created_by) && <span aria-label="متصل الآن" className="absolute end-0.5 top-0.5 h-3 w-3 rounded-full border-2 border-[var(--surface)] bg-[var(--accent)]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-bold text-white">{room.name}</h2>
                    <span className="shrink-0 rounded-md bg-[var(--success)]/10 px-1.5 py-0.5 text-[9px] font-bold text-[var(--success)]">مباشر</span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-white/50">{room.description || <>جلسة صوتية مع <Handle username={room.profiles?.username ?? 'مستخدم'} /></>}</p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-white/40">
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{room.member_count}/{room.capacity}</span>
                    <span>{room.profiles?.username ? <Handle username={room.profiles.username} /> : 'مضيف الغرفة'}</span>
                  </div>
                </div>
                <button type="button" aria-label={`دخول ${room.name}`} onClick={() => navigate(`/rooms/${room.id}`)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.07] text-white/75 transition hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]">
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </motion.article>
            ))}
          </div>
        )}
      </div>

      {createOpen && (
        createPortal(<div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !creating) setCreateOpen(false); }} className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/75 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" dir={getStoredDirection()}>
          <form aria-labelledby="create-room-title" onSubmit={(event) => void createRoom(event)} className="max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 id="create-room-title" className="text-lg font-bold text-white">إنشاء غرفة صوتية</h2>
                <p className="mt-1 text-xs text-white/45">حتى 6 مشاركين في الجلسة.</p>
              </div>
              <button type="button" aria-label="إغلاق" onClick={() => setCreateOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-white/60 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            <label className="mb-4 block text-xs font-medium text-white/70">
              اسم الغرفة
              <input autoFocus required maxLength={40} value={roomName} onChange={(event) => { setRoomName(event.target.value); setNameError(''); }} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? 'room-name-error' : undefined} placeholder="مثال: نقاشات التقنية" className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[var(--accent)]/50" />
              {nameError && <span id="room-name-error" role="alert" className="mt-1 block text-xs text-[var(--error)]">{nameError}</span>}
            </label>
            <label className="block text-xs font-medium text-white/70">
              وصف مختصر
              <textarea maxLength={120} rows={3} value={description} onChange={(event) => { setDescription(event.target.value); setDescriptionError(''); }} aria-invalid={Boolean(descriptionError)} aria-describedby={descriptionError ? 'room-description-error' : undefined} placeholder="شنو موضوع الجلسة؟" className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[var(--accent)]/50" />
              {descriptionError && <span id="room-description-error" role="alert" className="mt-1 block text-xs text-[var(--error)]">{descriptionError}</span>}
            </label>
            <label className="mt-4 block text-xs font-medium text-white/70">
              عدد المقاعد
              <select value={roomCapacity} onChange={(event) => setRoomCapacity(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-2)] px-3 py-3 text-sm text-white outline-none focus:border-[var(--accent)]/50">
                {roomCapacities.map((capacity) => <option key={capacity} value={capacity}>{capacity} مقاعد</option>)}
              </select>
            </label>
            {createError && <p role="alert" className="mt-3 text-xs text-[var(--error)]">{createError}</p>}
            <button type="submit" disabled={creating} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] py-3 text-sm font-bold text-[var(--accent-foreground)] transition hover:brightness-110 disabled:opacity-50">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic2 className="h-4 w-4" />}
              {creating ? 'كنوجدو الغرفة...' : 'بدا الجلسة'}
            </button>
          </form>
        </div>, document.body)
      )}
    </div>
  );
}
