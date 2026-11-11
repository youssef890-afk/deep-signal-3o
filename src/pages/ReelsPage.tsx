import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useNavigate,
  Link,
  useSearchParams,
} from 'react-router-dom';

import { supabase } from '@/lib/supabase';

import {
  Heart,
  MessageCircle,
  Share2,
  Music2,
  Loader2,
  Volume2,
  VolumeX,
  Play,
} from 'lucide-react';

import AnimatedAvatar from '@/components/AnimatedAvatar';
import Handle from '@/components/Handle';
import PostSummarizer from '@/components/PostSummarizer';
import { getStoredLanguage, translate } from '@/lib/i18n';

interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  caption: string | null;
  created_at: string;
  post_type: 'reel';
  video_type: 'reel';
  profile: {
    username: string;
    avatar_url: string | null;
  } | null;
}

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetReelId = searchParams.get('reel');
  const t = (key: 'reelsTitle' | 'reelsLoadError' | 'reelsEmpty' | 'returnFeed' | 'retry') =>
    translate(getStoredLanguage(), key);

  const loadReels = useCallback(async (targetId: string | null = null) => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          video_url,
          caption,
          created_at,
          post_type,
          video_type,
          profile:profiles(
            username,
            avatar_url
          )
        `)
        .eq('post_type', 'reel')
        .eq('video_type', 'reel')
        .not('video_url', 'is', null)
        .order('created_at', {
          ascending: false,
        })
        .limit(30);

      if (error) {
        throw error;
      }

      const loadedReels = (data ?? []).map((reel) => ({
        ...reel,
        profile: Array.isArray(reel.profile)
          ? reel.profile[0] ?? null
          : reel.profile,
      })) as Reel[];

      if (targetId && !loadedReels.some((reel) => reel.id === targetId)) {
        const { data: targetReel, error: targetError } = await supabase
          .from('posts')
          .select(`
            id,
            user_id,
            video_url,
            caption,
            created_at,
            post_type,
            video_type,
            profile:profiles(
              username,
              avatar_url
            )
          `)
          .eq('id', targetId)
          .eq('post_type', 'reel')
          .eq('video_type', 'reel')
          .not('video_url', 'is', null)
          .maybeSingle();
        if (targetError) throw targetError;
        if (targetReel) {
          loadedReels.push({
            ...targetReel,
            profile: Array.isArray(targetReel.profile)
              ? targetReel.profile[0] ?? null
              : targetReel.profile,
          } as Reel);
        }
      }

      setLoadError(false);
      setReels(loadedReels);
    } catch (error) {
      console.error(
        'Error loading reels:',
        error
      );

      setLoadError(true);
      setReels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReels(targetReelId);
  }, [loadReels, targetReelId]);

  useEffect(() => {
    if (!targetReelId || !reels.some((reel) => reel.id === targetReelId)) return;
    document.getElementById(`reel-${targetReelId}`)?.scrollIntoView({ block: 'start' });
  }, [reels, targetReelId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="grid min-h-[65dvh] place-items-center px-4 py-10 text-[var(--text)]">
        <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 text-center shadow-xl">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]"><Play className="h-6 w-6" /></span>
          <h1 className="mt-4 text-lg font-bold">{t('reelsTitle')}</h1>
          {loadError ? (
            <>
              <p role="alert" className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{t('reelsLoadError')}</p>
              <button type="button" onClick={() => void loadReels(targetReelId)} className="mt-5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--accent-foreground)] transition hover:brightness-110">{t('retry')}</button>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{t('reelsEmpty')}</p>
              <Link to="/feed" className="mt-5 inline-flex rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--accent-foreground)] transition hover:brightness-110">{t('returnFeed')}</Link>
            </>
          )}
        </section>
      </div>
    );
  }

  return (
    <main className="
      h-screen
      w-full
      bg-black
      overflow-y-auto
      snap-y
      snap-mandatory
      scrollbar-hide
    ">
      {reels.map((reel, index) => (
        <ReelItem
          key={reel.id}
          reel={reel}
          navigate={navigate}
          preloadNext={index <= 1}
        />
      ))}
    </main>
  );
}

function ReelItem({
  reel,
  navigate,
  preloadNext,
}: {
  reel: Reel;
  navigate: ReturnType<typeof useNavigate>;
  preloadNext: boolean;
}) {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  const containerRef =
    useRef<HTMLDivElement>(null);

  const [isVisible, setIsVisible] =
    useState(false);

  const [isPlaying, setIsPlaying] =
    useState(false);

  const [isMuted, setIsMuted] =
    useState(true);

  /*
   * مراقبة الـReel اللي داخل الشاشة
   */
  useEffect(() => {
    const element =
      containerRef.current;
    const video = videoRef.current;

    if (!element || !video) return;

    const observer =
      new IntersectionObserver(
        (entries) => {
          const entry =
            entries[0];

          if (entry.isIntersecting) {
            setIsVisible(true);

            /*
             * يبدأ Muted
             */
            video.muted = true;

            void video
              .play()
              .then(() => {
                setIsPlaying(true);
              })
              .catch(() => {
                setIsPlaying(false);
              });
          } else {
            setIsVisible(false);

            /*
             * مهم:
             * أي Reel خرج من الشاشة
             * يتوقف مباشرة.
             */
            video.pause();

            setIsPlaying(false);
          }
        },
        {
          threshold: 0.75,
        }
      );

    observer.observe(element);

    return () => {
      observer.disconnect();

      video.pause();
    };
  }, []);

  function togglePlay() {
    const video =
      videoRef.current;

    if (!video) return;

    if (video.paused) {
      void video.play();

      setIsPlaying(true);
    } else {
      video.pause();

      setIsPlaying(false);
    }
  }

  function toggleMute() {
    const video =
      videoRef.current;

    if (!video || !isVisible) {
      return;
    }

    video.muted =
      !video.muted;

    setIsMuted(
      video.muted
    );
  }

  async function handleShare() {
    const shareUrl = new URL('/reels', window.location.origin);
    shareUrl.searchParams.set('reel', reel.id);
    const url = shareUrl.toString();

    const copyLink = async () => {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        return;
      }

      const input = document.createElement('textarea');
      input.value = url;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      let copied = false;
      try {
        input.select();
        copied = document.execCommand('copy');
      } finally {
        input.remove();
      }
      if (!copied) throw new Error('Clipboard copy was rejected.');
    };

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Deep-Signal Reel',
          text: reel.caption || 'شوف هاد الـReel',
          url,
        });
        return;
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          return;
        }

        console.error('Native share failed; trying to copy the Reel link:', error);
      }
    }

    try {
      await copyLink();
      alert('تم نسخ الرابط');
    } catch (error) {
      console.error('Reel link could not be copied:', error);
      alert('تعذر نسخ الرابط. حاول مرة أخرى.');
    }
  }

  const username =
    reel.profile?.username ||
    'مستخدم';

  return (
    <section
      ref={containerRef}
      id={`reel-${reel.id}`}
      className="
        relative
        h-screen
        w-full
        snap-start
        bg-black
        overflow-hidden
        flex
        items-center
        justify-center
      "
    >
      <video
        ref={videoRef}
        src={reel.video_url}
        loop
        playsInline
        muted
        preload={isVisible || preloadNext ? 'auto' : 'metadata'}
        onClick={togglePlay}
        className="
          h-full
          w-full
          object-cover
          cursor-pointer
        "
      />

      {/* Gradient */}
      <div className="
        absolute
        inset-0
        pointer-events-none
        bg-gradient-to-b
        from-black/10
        via-transparent
        to-black/80
      " />

      {/* Play */}
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          className="
            absolute
            inset-0
            z-20
            flex
            items-center
            justify-center
          "
        >
          <div className="
            w-16
            h-16
            rounded-full
            bg-black/50
            backdrop-blur-md
            flex
            items-center
            justify-center
          ">
            <Play
              className="
                w-8
                h-8
                text-white
                fill-white
              "
            />
          </div>
        </button>
      )}

      {/* معلومات صاحب الـReel */}
      <div className="
        absolute
        left-4
        right-20
        bottom-20
        z-30
        text-white
      ">
        <div
          className="
            flex
            items-center
            gap-3
            cursor-pointer
            mb-3
          "
          onClick={() =>
            navigate(
              `/profile/${reel.user_id}`
            )
          }
        >
          <AnimatedAvatar
            src={
              reel.profile?.avatar_url
            }
            name={username}
            size="sm"
          />

          <span className="
            font-bold
            text-sm
          ">
            <Handle username={username} />
          </span>
        </div>

        {reel.caption && (
          <p className="
            text-sm
            text-white
            mb-3
            line-clamp-3
          ">
            {reel.caption}
          </p>
        )}

        {reel.caption && <PostSummarizer text={reel.caption} />}

        <div className="
          flex
          items-center
          gap-2
          text-xs
          text-neutral-300
        ">
          <Music2 className="
            w-4
            h-4
          " />

          <span>
            الصوت الأصلي - {username}
          </span>
        </div>
      </div>

      {/* الأزرار */}
      <div className="
        absolute
        right-4
        bottom-24
        z-30
        flex
        flex-col
        gap-5
        items-center
      ">
        {/* الصوت */}
        <button
          type="button"
          onClick={toggleMute}
          className="
            w-12
            h-12
            rounded-full
            bg-black/50
            backdrop-blur-md
            border
            border-white/10
            flex
            items-center
            justify-center
            text-white
          "
        >
          {isMuted ? (
            <VolumeX className="w-6 h-6" />
          ) : (
            <Volume2 className="w-6 h-6" />
          )}
        </button>

        {/* Like */}
        <button
          type="button"
          className="
            w-12
            h-12
            rounded-full
            bg-black/50
            backdrop-blur-md
            border
            border-white/10
            flex
            items-center
            justify-center
            text-white
          "
        >
          <Heart className="w-6 h-6" />
        </button>

        {/* Comments */}
        <button
          type="button"
          onClick={() =>
            navigate(
              `/post/${reel.id}`
            )
          }
          className="
            w-12
            h-12
            rounded-full
            bg-black/50
            backdrop-blur-md
            border
            border-white/10
            flex
            items-center
            justify-center
            text-white
          "
        >
          <MessageCircle className="w-6 h-6" />
        </button>

        {/* Share */}
        <button
          type="button"
          onClick={() =>
            void handleShare()
          }
          className="
            w-12
            h-12
            rounded-full
            bg-black/50
            backdrop-blur-md
            border
            border-white/10
            flex
            items-center
            justify-center
            text-white
          "
        >
          <Share2 className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
}
