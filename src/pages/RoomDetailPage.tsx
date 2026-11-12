import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLiveRoomAudio } from '@/hooks/useLiveRoomAudio';
import { useOnlineUsers } from '@/hooks/useOnlinePresence';
import {
  Loader2,
  Mic,
  MicOff,
  Users,
  Gamepad2,
  X,
  ArrowLeft,
  Crown,
  Copy,
  UserPlus,
} from 'lucide-react';

interface RoomProfile {
  username: string;
  avatar_url: string | null;
}

interface Room {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  is_active: boolean;
  capacity: number;
  invite_code: string;
  profiles: RoomProfile | null;
}

interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  role: string;
  profiles: RoomProfile | null;
}

interface Challenge {
  question: string;
  answer: string;
}

export default function RoomDetailPage() {
  const { roomId } = useParams<{
    roomId: string;
  }>();

  const { user } = useAuth();
  const { onlineIds } = useOnlineUsers();
  const navigate = useNavigate();

  const [room, setRoom] =
    useState<Room | null>(null);

  const [members, setMembers] =
    useState<RoomMember[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [isMuted, setIsMuted] =
    useState(false);

  const [gameActive, setGameActive] =
    useState(false);

  const [challenge, setChallenge] =
    useState('');

  const [gameAnswer, setGameAnswer] =
    useState('');

  const [showAnswer, setShowAnswer] =
    useState(false);
  const [joinError, setJoinError] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);

  const isMember = members.some((member) => member.user_id === user?.id);
    const liveAudio = useLiveRoomAudio(roomId ?? '', user?.id, isMember, isMuted);

    const sortedMembers = useMemo(() => {
      if (!room) return members;
      const host = members.find((m) => m.user_id === room.created_by);
      if (!host) return members;
      return [...members].sort((a, b) => {
        if (a.user_id === room.created_by) return -1;
        if (b.user_id === room.created_by) return 1;
        return 0;
      });
    }, [members, room]);

  const fetchRoom = useCallback(async () => {
    if (!roomId) return;

    const {
      data,
      error,
    } = await supabase
      .from('rooms')
      .select(
        `*, profiles:created_by (username, avatar_url)`
      )
      .eq('id', roomId)
      .single();

    if (error || !data) {
      console.error(
        'Error loading room:',
        error
      );

      navigate('/rooms');
      return;
    }

    if (data.is_active === false) {
      navigate('/rooms');
      return;
    }

    setRoom(data as Room);
    setLoading(false);
  }, [roomId, navigate]);

  const fetchMembers = useCallback(async () => {
    if (!roomId) return;

    const {
      data,
      error,
    } = await supabase
      .from('room_members')
      .select(
        `*, profiles:user_id (username, avatar_url)`
      )
      .eq('room_id', roomId)
      .order('joined_at', {
        ascending: true,
      });

    if (error) {
      console.error(
        'Error loading members:',
        error
      );

      setMembers([]);
      return;
    }

    setMembers(
      (data as RoomMember[]) || []
    );
  }, [roomId]);

  const subscribeToMembers = useCallback(() => {
    if (!roomId) {
      return () => undefined;
    }

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void fetchMembers();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [roomId, fetchMembers]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-status-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        ({ new: updatedRoom }) => {
          if (updatedRoom.is_active === false) {
            alert('انتهت الجلسة لأن صاحب الغرفة لم يعد متصلاً.');
            navigate('/rooms');
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, navigate]);

  useEffect(() => {
    if (!roomId) {
      navigate('/rooms');
      return;
    }

    void fetchRoom();
    void fetchMembers();

    const cleanup = subscribeToMembers();
    return () => {
      cleanup();
    };
  }, [roomId, navigate, fetchRoom, fetchMembers, subscribeToMembers]);

  async function joinRoom() {
    if (!user || !roomId || !room) return;

    if (members.length >= room.capacity) {
      setJoinError('الغرفة مكتملة العدد.');
      return;
    }

    const alreadyMember =
      members.some(
        (member) =>
          member.user_id === user.id
      );

    if (alreadyMember) {
      return;
    }

    const { error } = await supabase
      .from('room_members')
      .upsert({
        room_id: roomId,
        user_id: user.id,
        role: 'member',
      }, { onConflict: 'room_id,user_id', ignoreDuplicates: true });

    if (error) {
      console.error('Could not join room:', error);
      setJoinError(error.code === '23503'
        ? 'تعذر الانضمام لأن معلومات الحساب غير مكتملة. أعد تسجيل الدخول ثم حاول مرة أخرى.'
        : 'تعذر الانضمام للغرفة الآن. تحقق من اتصالك ثم حاول مرة أخرى.');
      return;
    }

    setJoinError('');
    await fetchMembers();
  }

  async function copyInviteCode() {
    if (!room) return;
    try {
      if (!navigator.clipboard?.writeText) {
        window.prompt('انسخ رمز دعوة الغرفة:', room.invite_code);
        return;
      }
      await navigator.clipboard.writeText(room.invite_code);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 1800);
    } catch (error) {
      console.error('Room invite code could not be copied:', error);
      window.prompt('انسخ رمز دعوة الغرفة:', room.invite_code);
    }
  }

  async function leaveRoom() {
    if (!user || !roomId) return;

    const {
      error,
    } = await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Could not leave room:', error);
      alert('تعذر مغادرة الغرفة الآن. تحقق من اتصالك ثم حاول مرة أخرى.');
      return;
    }

    navigate('/rooms');
  }

  async function kickMember(
    memberTableId: string
  ) {
    if (
      !user ||
      !room ||
      user.id !== room.created_by
    ) {
      return;
    }

    const {
      error,
    } = await supabase
      .from('room_members')
      .delete()
      .eq('id', memberTableId);

    if (error) {
      console.error('Could not remove room member:', error);
      alert('تعذر إزالة العضو الآن. حاول مرة أخرى.');
      return;
    }

    await fetchMembers();
  }

  async function endRoom() {
    if (
      !user ||
      !room ||
      !roomId ||
      user.id !== room.created_by
    ) {
      return;
    }

    if (
      !window.confirm(
        'هل تريد إنهاء الجلسة للجميع؟'
      )
    ) {
      return;
    }

    const {
      error,
    } = await supabase
      .from('rooms')
      .update({
        is_active: false,
      })
      .eq('id', roomId);

    if (error) {
      console.error('Could not end room:', error);
      alert('تعذر إنهاء الجلسة الآن. تحقق من اتصالك ثم حاول مرة أخرى.');
      return;
    }

    navigate('/rooms');
  }

  function startGame() {
    const challenges: Challenge[] = [
      {
        question:
          'ما هو عكس كلمة "نور"؟',
        answer: 'ظلام',
      },
      {
        question:
          'اذكر 3 دول عربية تبدأ بحرف "م"',
        answer:
          'مصر، المغرب، موريتانيا',
      },
      {
        question:
          'ما هو أطول نهر في العالم؟',
        answer: 'نهر النيل',
      },
      {
        question:
          'ما هي عاصمة المغرب؟',
        answer: 'الرباط',
      },
    ];

    const randomChallenge =
      challenges[
        Math.floor(
          Math.random() *
            challenges.length
        )
      ];

    setChallenge(
      randomChallenge.question
    );

    setGameAnswer(
      randomChallenge.answer
    );

    setShowAnswer(false);
    setGameActive(true);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-20 text-neutral-500">
        الغرفة غير موجودة
      </div>
    );
  }

  const isCreator =
    user?.id === room.created_by;

  const seats = Array.from({ length: room.capacity });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-48">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/rooms')}
              className="text-neutral-400 hover:text-white transition"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">{room.name}</h1>
              <p className="text-xs text-white/50 mt-1 max-w-xl sm:max-w-2xl line-clamp-2">{room.description ?? 'جلسة صوتية حية'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-green-400">مباشر</span>
            </div>
            <div className="rounded-full bg-white/5 px-3 py-1.5 text-sm font-medium text-white/70">{sortedMembers.length}/{room.capacity}</div>
          </div>
        </div>
      </div>

      {isCreator && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <code className="font-mono text-sm font-bold text-green-400 select-all tracking-wide">{room.invite_code}</code>
          <button
            type="button"
            onClick={() => void copyInviteCode()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/75 transition hover:bg-white/[0.06] hover:text-white"
          >
            <Copy className="h-4 w-4" />
            {inviteCopied ? 'تم النسخ ✓' : 'نسخ الرمز'}
          </button>
        </div>
      )}

      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--accent)]" />
            المقاعد ({members.length}/{room.capacity})
          </h2>


        </div>

        {liveAudio.error && <p role="alert" className="mb-4 text-xs text-[var(--error)]">{liveAudio.error}</p>}
        {joinError && <p role="alert" className="mb-4 text-xs text-[var(--error)]">{joinError}</p>}
        {liveAudio.remoteAudio.length > 0 && (
          <div className="mb-4 space-y-2">
            {liveAudio.remoteAudio.map((remote) => (
              <RoomRemoteAudio key={remote.userId} userId={remote.userId} stream={remote.stream} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-4">
          {Array.from({ length: room.capacity }).map((_, index) => {
            const member = sortedMembers[index] ?? null;
            const isHost = member?.user_id === room.created_by;
            return (
              <div
                key={index}
                className="flex flex-col items-center"
              >
                {member ? (
                  <>
                    <div
                className="relative flex items-center justify-center w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-white/10 overflow-hidden ring-2 ring-white/10 transition-transform duration-200 hover:scale-105"
              >
                      {member.profiles?.avatar_url ? (
                        <img
                          src={member.profiles.avatar_url}
                          alt={member.profiles.username ?? ''}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-white/60">
                          {member.profiles?.username?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      )}
                      {onlineIds.includes(member.user_id) && (
                        <span aria-label="متصل الآن" className="absolute bottom-1 start-1 h-3.5 w-3.5 rounded-full border-2 border-[var(--bg)] bg-[var(--accent)]" />
                      )}
                      {isHost && (
                        <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-green-500/40 text-green-400">
                          <Crown className="w-3 h-3" />
                        </span>
                      )}
                      {/* Muted badge placeholder - will appear when per-member mute exists */}
                      {/* {member.is_muted && (
                        <span className="absolute top-1 left-1 flex items-center justify-center w-4 h-4 rounded-full bg-black/30 text-white">
                          <MicOff className="w-3 h-3" />
                        </span>
                      )} */}
                    </div>
                    <span className="mt-2 text-sm font-medium text-white truncate max-w-[120px]">
                      {member.profiles?.username || 'عضو'}
                    </span>
                    {isHost && (
                      <span className="mt-1 text-xs font-semibold text-green-400">المضيف</span>
                    )}
                    {isCreator && member.user_id !== user?.id && (
                      <button
                        onClick={() => void kickMember(member.id)}
                        className="absolute -top-1 -right-1 p-1 rounded-full text-red-400 hover:bg-red-500/20 transition"
                        aria-label="طرد العضو"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center py-3 text-white/30">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <span className="mt-2 text-xs">مقعد فارغ</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!isMember && (
          <button
            onClick={() =>
              void joinRoom()
            }
            disabled={members.length >= room.capacity}
            className="w-full mt-5 py-3 bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--accent-foreground)] rounded-xl font-medium text-sm"
          >
            صعود للمقعد
          </button>
        )}
      </div>

      {isMember && (
        <div className="sticky bottom-0 left-0 right-0 bg-black/30 backdrop-blur-md rounded-t-2xl p-4 flex items-center justify-center gap-4 border-t border-white/10">
          <button
            onClick={() => liveAudio.audioStarted ? (isMuted ? setIsMuted(false) : liveAudio.stopAudio()) : liveAudio.startAudio()}
            className="relative w-16 h-16 rounded-full bg-white/10 text-white flex items-center justify-center transition hover:bg-white/20"
            aria-label={liveAudio.audioStarted ? (isMuted ? 'إلغاء كتم الميكروفون' : 'كتم الميكروفون') : 'تشغيل الميكروفون'}
          >
            {liveAudio.audioStarted && !isMuted ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
          </button>
          <div className="flex items-center gap-3">
            {!isCreator && (
              <button
                onClick={() => leaveRoom()}
                className="px-4 py-2 rounded-xl bg-white/10 text-white font-medium text-sm transition hover:bg-white/20"
              >
                مغادرة الغرفة
              </button>
            )}
            {isCreator && (
              <button
                onClick={() => endRoom()}
                className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-medium text-sm transition hover:bg-red-500/20"
              >
                إنهاء الجلسة
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-[var(--accent)]" />
            تحديات وألغاز
          </h2>

          {isCreator && (
            <button
              onClick={startGame}
              className="px-3 py-1.5 bg-[var(--accent)]/20 text-[var(--accent)] rounded-xl text-xs"
            >
              تحد جديد
            </button>
          )}
        </div>

        {gameActive ? (
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-neutral-400 text-xs mb-1">
              السؤال:
            </p>

            <p className="text-white font-medium text-base mb-4">
              {challenge}
            </p>

            <button
              onClick={() =>
                setShowAnswer(
                  (previous) => !previous
                )
              }
              className="px-4 py-2 bg-neutral-800 text-xs text-white rounded-lg"
            >
              {showAnswer
                ? 'إخفاء الإجابة'
                : 'كشف الإجابة'}
            </button>

            {showAnswer && (
              <p className="text-green-400 text-sm mt-3 font-semibold">
                الإجابة: {gameAnswer}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-neutral-500 text-center py-4">
            {isCreator
              ? 'اضغط على "تحد جديد" لبدء التنافس بين الحضور'
              : 'في انتظار المنشئ لبدء التحدي...'}
          </p>
        )}
      </div>
    </div>
  );
}

function RoomRemoteAudio({ userId, stream }: { userId: string; stream: MediaStream }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.srcObject = stream;
    void audio.play().catch(() => undefined);
    return () => { audio.srcObject = null; };
  }, [stream]);

  return (
    <div className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2" dir="ltr">
      <span className="min-w-0 flex-1 truncate text-[10px] text-white/50">{userId.slice(0, 8)}</span>
      <audio ref={audioRef} autoPlay controls className="h-8 w-40" />
    </div>
  );
}
