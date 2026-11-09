import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLiveRoomAudio } from '@/hooks/useLiveRoomAudio';
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
        ? 'ملف الحساب غير مكتمل بعد. سجّل الخروج ثم الدخول، أو طبّق إصلاح إنشاء الملفات الشخصية في Supabase.'
        : 'تعذر الانضمام للغرفة. تحقق من اتصالك وصلاحيات قاعدة البيانات.');
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
      alert(
        'تعذر مغادرة الغرفة: ' +
          error.message
      );
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
      alert(
        'تعذر طرد العضو: ' +
          error.message
      );
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
      alert(
        'تعذر إنهاء الجلسة: ' +
          error.message
      );
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
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5 mb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              navigate('/rooms')
            }
            className="text-neutral-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div>
            <h1 className="text-xl font-bold text-white">
              {room.name}
            </h1>

            <p className="text-xs text-neutral-400">
              {room.description ||
                'جلسة صوتية حية'}
            </p>
          </div>
        </div>

        {isCreator ? (
          <button
            onClick={() =>
              void endRoom()
            }
            className="px-3 py-1.5 rounded-xl bg-[var(--error)]/20 text-[var(--error)] text-xs"
          >
            إنهاء الجلسة
          </button>
        ) : isMember ? (
          <button
            onClick={() =>
              void leaveRoom()
            }
            className="px-3 py-1.5 bg-neutral-800 text-white rounded-xl text-xs"
          >
            مغادرة
          </button>
        ) : null}
      </div>

      {isCreator && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/[0.05] p-4">
          <div className="min-w-0">
            <p className="text-[10px] text-white/45">رمز دعوة الغرفة</p>
            <code className="mt-1 block select-all font-mono text-lg font-bold tracking-[0.18em] text-[var(--accent)]">{room.invite_code}</code>
          </div>
          <button type="button" onClick={() => void copyInviteCode()} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/75 transition hover:bg-white/[0.06]">
            <Copy className="h-4 w-4" />{inviteCopied ? 'تم النسخ' : 'نسخ الرمز'}
          </button>
        </div>
      )}

      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--accent)]" />
            المقاعد ({members.length}/{room.capacity})
          </h2>

          {isMember && (
            <button
              onClick={() => liveAudio.audioStarted
                ? setIsMuted((previous) => !previous)
                : void liveAudio.startAudio()}
              aria-label={!liveAudio.audioStarted ? 'تشغيل الميكروفون' : isMuted ? 'إلغاء كتم الميكروفون' : 'كتم الميكروفون'}
              className={`p-2 rounded-full ${
                !liveAudio.audioStarted || isMuted
                  ? 'bg-white/10 text-white/65'
                  : 'bg-green-500/20 text-green-400'
              }`}
            >
              {!liveAudio.audioStarted || isMuted ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          )}
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

        <div className="grid grid-cols-3 gap-4">
          {seats.map((_, index) => {
            const member =
              members[index];

            return (
              <div
                key={index}
                className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/5 rounded-xl relative min-h-[100px]"
              >
                {member ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--accent-foreground)] font-bold text-lg mb-2 relative overflow-hidden">
                      {member.profiles?.avatar_url ? (
                        <img
                          src={
                            member.profiles.avatar_url
                          }
                          alt={
                            member.profiles.username
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        member.profiles?.username
                          ?.charAt(0)
                          .toUpperCase() ||
                        'U'
                      )}

                      {member.user_id ===
                        room.created_by && (
                        <Crown className="w-4 h-4 text-[var(--accent-secondary)] absolute -top-1 -right-1" />
                      )}
                    </div>

                    <span className="text-xs text-white truncate max-w-[80px]">
                      {member.profiles
                        ?.username ||
                        'User'}
                    </span>

                    {isCreator &&
                      member.user_id !==
                        user?.id && (
                        <button
                          onClick={() =>
                            void kickMember(
                              member.id
                            )
                          }
                          className="absolute right-2 top-2 text-[var(--error)] hover:brightness-125"
                          aria-label="طرد العضو"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                  </>
                ) : (
                  <div className="flex flex-col items-center text-neutral-600">
                    <UserPlus className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">
                      مقعد فارغ
                    </span>
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
