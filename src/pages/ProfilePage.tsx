import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import SettingsPanel from '@/components/SettingsPanel';
import SafetyActions from '@/components/SafetyActions';
import Handle from '@/components/Handle';
import { supabase } from '@/lib/supabase';
import { generateAiImage } from '@/lib/aiAssistant';
import { formatDisplayId } from '@/utils/format';
import { getStoredLanguage, translate, type TranslationKey } from '@/lib/i18n';

import {
  UserPlus,
  UserCheck,
  MessageSquare,
  Camera,
  Loader2,
  Edit3,
  X,
  Check,
  Grid,
  Settings,
  Music2,
  WandSparkles,
} from 'lucide-react';

interface ProfileData {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  cover_url?: string | null;
  bio: string | null;
  created_at?: string;
  display_id?: number | string | null;
}

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

interface PostData {
  id: string;
  image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  media_urls: string[] | null;
  post_type: 'text' | 'image' | 'video' | 'reel' | 'audio' | null;
  caption: string | null;
  created_at: string;
}

interface ProfileBadge {
  id: string;
  label: string;
  className: string;
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { session } = useAuth();
  const user = session?.user ?? null;
  const navigate = useNavigate();

  const routeIdentifier = userId?.trim().replace(/^@/, '') || user?.id;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userPosts, setUserPosts] = useState<PostData[]>([]);
  const [profileBadges, setProfileBadges] = useState<ProfileBadge[]>([]);
  const [profileError, setProfileError] = useState<TranslationKey | null>(null);

  const [loading, setLoading] = useState(true);
  const targetUserId = profile?.id ?? (routeIdentifier && isUuid(routeIdentifier) ? routeIdentifier : undefined);
  const isOwnProfile = Boolean(user && (!userId || user.id === targetUserId));

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [generatingImage, setGeneratingImage] = useState<'avatar' | 'cover' | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const t = (key: TranslationKey) => translate(getStoredLanguage(), key);

  // ============================================
  // تحميل معلومات البروفايل
  // ============================================

  const loadProfileData = useCallback(async () => {
    if (!routeIdentifier) {
      setProfileError('profileSignInRequired');
      setLoading(false);
      return;
    }

    setLoading(true);
    setProfileError(null);
    setProfile(null);
    setUserPosts([]);
    setProfileBadges([]);
    setFollowersCount(0);
    setFollowingCount(0);
    setIsFollowing(false);

    let profileLoaded = false;
    try {
      // Accept both /profile/<uuid> and /profile/<username> links.
      const profileQuery = supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio, display_id, created_at');
      const { data: prof, error: profErr } = isUuid(routeIdentifier)
        ? await profileQuery.eq('id', routeIdentifier).maybeSingle()
        : await profileQuery.eq('username', routeIdentifier).maybeSingle();

      if (profErr) {
        throw profErr;
      }
      if (!prof) {
        setProfileError('profileNotFound');
        return;
      }

      const profileData: ProfileData = prof;
      const profileId = profileData.id;

      setProfile(profileData);
      setFullName(profileData.full_name || '');
      setBio(profileData.bio || '');
      profileLoaded = true;

      // جلب منشورات المستخدم
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, image_url, video_url, media_urls, post_type, caption, created_at')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      if (postsError) {
        throw postsError;
      }

      const loadedPosts = ((posts ?? []) as Omit<PostData, 'audio_url'>[]).map((post) => ({
        ...post,
        audio_url: null,
      }));
      setUserPosts(loadedPosts);

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const recentPosts = loadedPosts.filter((post) => Date.parse(post.created_at) >= Date.parse(weekAgo)).length;
      const { data: scores, error: scoresError } = await supabase
        .from('game_scores')
        .select('points')
        .eq('user_id', profileId)
        .gte('created_at', weekAgo);
      if (scoresError) {
        console.warn('Weekly profile game scores are unavailable; verify the Supabase migrations:', scoresError);
      }
      const weeklyPoints = (scores ?? []).reduce((sum, score) => sum + score.points, 0);
      const nextBadges: ProfileBadge[] = [];
      if (loadedPosts.length >= 5) nextBadges.push({ id: 'creator', label: 'صانع محتوى', className: 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]' });
      if (recentPosts >= 3) nextBadges.push({ id: 'active', label: 'نشيط هذا الأسبوع', className: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200' });
      if (weeklyPoints >= 15) nextBadges.push({ id: 'gamer', label: 'بطل الألعاب', className: 'border-[var(--accent-secondary)]/20 bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)]' });
      setProfileBadges(nextBadges);

      // عدد المتابعين
      const {
        count: followersCountResult,
        error: followersError,
      } = await supabase
        .from('follows')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('following_id', profileId);

      if (followersError) {
        throw followersError;
      }

      setFollowersCount(followersCountResult || 0);

      // عدد الذين يتابعهم المستخدم
      const {
        count: followingCountResult,
        error: followingError,
      } = await supabase
        .from('follows')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('follower_id', profileId);

      if (followingError) {
        throw followingError;
      }

      setFollowingCount(followingCountResult || 0);

      // واش المستخدم الحالي متابع هاد الشخص؟
      if (user && user.id !== profileId) {
        const {
          data: followingData,
          error: followingCheckError,
        } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profileId)
          .maybeSingle();

        if (followingCheckError) {
          throw followingCheckError;
        }

        setIsFollowing(Boolean(followingData));
      } else {
        setIsFollowing(false);
      }
    } catch (error) {
      if (profileLoaded) {
        // Related tables can fail independently; keep the profile itself visible.
        console.error('Profile loaded, but related profile data failed:', error);
        setProfileError('profileLoadError');
      } else {
        console.error('Error loading profile:', error);
        setProfileError('profileLoadError');
      }
    } finally {
      setLoading(false);
    }
  }, [routeIdentifier, user]);

  useEffect(() => {
    if (!user?.id || !targetUserId || isOwnProfile) return;

    void supabase.from('profile_views').insert({
      profile_id: targetUserId,
      viewer_id: user.id,
    }).then(({ error }) => {
      if (error) console.error('Profile view could not be recorded:', error);
    });
  }, [isOwnProfile, targetUserId, user?.id]);

  useEffect(() => {
    void loadProfileData();
  }, [loadProfileData]);

  // ============================================
  // تسجيل الخروج
  // ============================================

  // ============================================
  // Follow / Unfollow
  // ============================================

  async function handleToggleFollow() {
    if (
      !user ||
      !targetUserId ||
      isOwnProfile ||
      followLoading
    ) {
      return;
    }

    setFollowLoading(true);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) {
          throw error;
        }

        setIsFollowing(false);

        setFollowersCount((previousCount) =>
          Math.max(0, previousCount - 1)
        );
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          });

        if (error) {
          throw error;
        }

        setIsFollowing(true);

        setFollowersCount(
          (previousCount) => previousCount + 1
        );
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  }

  // ============================================
  // تغيير صورة البروفايل
  // ============================================

  async function handleAvatarUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file || !user) {
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExtension =
        file.name.split('.').pop() || 'jpg';

      const fileName =
        `${user.id}/${user.id}_avatar.${fileExtension}`;

      const { error: uploadError } =
        await supabase.storage
          .from('avatars')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
          });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } =
        supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

      const avatarUrl =
        publicUrlData.publicUrl;

      const { error: updateError } =
        await supabase
          .from('profiles')
          .update({
            avatar_url: avatarUrl,
          })
          .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      setProfile((previousProfile) =>
        previousProfile
          ? {
              ...previousProfile,
              avatar_url: avatarUrl,
            }
          : null
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'حدث خطأ غير معروف';

      alert(
        'خطأ في تحميل الصورة: ' + message
      );
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleGenerateProfileImage(kind: 'avatar' | 'cover') {
    if (!user || !isOwnProfile || generatingImage) return;
    setGeneratingImage(kind);

    try {
      const prompt = kind === 'avatar'
        ? 'Create a polished, original square profile avatar illustration for a social app. Do not include text, logos, or recognizable people.'
        : 'Create an elegant abstract 16:9 social profile cover with a calm dark background and subtle emerald, rose, and gold details. No text or logos.';
      const base64 = await generateAiImage(prompt);
      const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
      const filePath = `${user.id}/generated-${kind}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, new Blob([bytes], { type: 'image/png' }), {
          cacheControl: '3600',
          contentType: 'image/png',
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const url = data.publicUrl;
      const column = kind === 'avatar' ? 'avatar_url' : 'cover_url';
      const { error: updateError } = await supabase.from('profiles').update({ [column]: url }).eq('id', user.id);
      if (updateError) throw updateError;

      setProfile((current) => current ? { ...current, [column]: url } : current);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر توليد الصورة';
      alert(`توليد الصورة غير متاح: ${message}. تأكد من نشر Edge Function وضبط OPENAI_API_KEY.`);
    } finally {
      setGeneratingImage(null);
    }
  }

  // ============================================
  // تعديل البروفايل
  // ============================================

  async function handleUpdateProfile() {
    if (!user) {
      return;
    }

    try {
      const newFullName =
        fullName.trim();

      const newBio =
        bio.trim();

      const { error } =
        await supabase
          .from('profiles')
          .update({
            full_name:
              newFullName || null,

            bio:
              newBio || null,
          })
          .eq('id', user.id);

      if (error) {
        throw error;
      }

      setProfile((previousProfile) =>
        previousProfile
          ? {
              ...previousProfile,

              full_name:
                newFullName || null,

              bio:
                newBio || null,
            }
          : null
      );

      setFullName(newFullName);
      setBio(newBio);

      setIsEditing(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'حدث خطأ غير معروف';

      alert(
        'خطأ أثناء التحديث: ' + message
      );
    }
  }

  // ============================================
  // Loading
  // ============================================

  if (loading) {
    return (
      <div className="mx-auto min-h-[60vh] w-full max-w-xl space-y-5 px-4 py-6" dir={getStoredLanguage() === 'ar' ? 'rtl' : 'ltr'} role="status" aria-label={t('profileLoading')} aria-live="polite">
        <div className="skeleton h-32 rounded-2xl" />
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-4">
            <div className="skeleton h-20 w-20 shrink-0 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-4 w-2/5 rounded" />
              <div className="skeleton h-3 w-1/3 rounded" />
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-4/5 rounded" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="skeleton h-16 rounded-xl" />
            <div className="skeleton h-16 rounded-xl" />
            <div className="skeleton h-16 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // Profile غير موجود
  // ============================================

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center text-stone-200" dir={getStoredLanguage() === 'ar' ? 'rtl' : 'ltr'}>
        <div className="max-w-md rounded-2xl border border-stone-100/10 bg-stone-100/[0.04] p-6 shadow-2xl shadow-black/20">
          <p className="text-sm leading-7 text-stone-200/75">{t(profileError ?? 'profileNotFound')}</p>
          {profileError && profileError !== 'profileSignInRequired' && (
            <button type="button" onClick={() => void loadProfileData()} className="mt-4 rounded-full border border-stone-100/15 bg-stone-100/[0.08] px-5 py-2.5 text-xs font-semibold text-stone-50 transition hover:bg-stone-100/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-100/50">
              {t('retry')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // الصفحة
  // ============================================

  return (
    <div
      className="
        max-w-xl
        mx-auto
        px-4
        py-6
        pb-28
        text-white
        space-y-6
      "
    >
      {profileError && (
        <div role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm text-rose-100">
          <p>{t(profileError)}</p>
          <button type="button" onClick={() => void loadProfileData()} className="mt-3 rounded-lg border border-rose-200/20 px-3 py-2 text-xs font-semibold transition hover:bg-rose-200/10">
            {t('retry')}
          </button>
        </div>
      )}

      {/* ======================================
          Header
      ====================================== */}

      <div
        className="
          flex
          items-center
          justify-between
          mb-2
        "
      >
        <h1 className="text-lg font-bold">
          الملف الشخصي
        </h1>

        {isOwnProfile ? (
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
          >
            <Settings className="w-4 h-4" />

            <span className="text-xs font-bold">
              الإعدادات
            </span>
          </button>
        ) : (
          <SafetyActions
            targetUserId={profile?.id ?? targetUserId ?? ''}
            onBlocked={() => {
              if (user) {
                try {
                  localStorage.removeItem(`ds-feed-v1:${user.id}`);
                } catch (error) {
                  console.warn('Could not clear cached feed data:', error);
                }
              }
              window.location.replace('/feed');
            }}
          />
        )}
      </div>

      {/* ======================================
          Profile Card
      ====================================== */}

      <div
        className="
          bg-neutral-900
          border
          border-white/10
          rounded-2xl
          p-5
          shadow-xl
        "
      >

        <div
          className="relative mb-5 flex h-32 items-end overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-emerald-950 via-neutral-900 to-rose-950 bg-cover bg-center p-3"
          style={profile.cover_url ? { backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.7), transparent), url(${profile.cover_url})` } : undefined}
        >
          <span className="text-[10px] font-medium text-white/65">غلاف الملف الشخصي</span>
          {isOwnProfile && (
            <button
              type="button"
              onClick={() => void handleGenerateProfileImage('cover')}
              disabled={generatingImage !== null}
              className="mr-auto inline-flex items-center gap-1.5 rounded-lg bg-black/45 px-2.5 py-1.5 text-[10px] font-medium text-white transition hover:bg-black/65 disabled:opacity-50"
            >
              {generatingImage === 'cover' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WandSparkles className="h-3.5 w-3.5" />}
              توليد غلاف
            </button>
          )}
        </div>

        {/* معلومات المستخدم */}

        <div className="flex items-center gap-4">

          {/* Avatar */}

          <div className="relative">

            <div
              className="
                w-20
                h-20
                rounded-full
                bg-[var(--accent)]/20
                border-2
                border-[var(--accent)]/50
                flex
                items-center
                justify-center
                font-bold
                text-2xl
                overflow-hidden
              "
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="
                    w-full
                    h-full
                    object-cover
                  "
                />
              ) : (
                profile.username
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>

            {/* تغيير الصورة */}

            {isOwnProfile && (
              <label
                className="
                  absolute
                  bottom-0
                  right-0
                  bg-[var(--accent)]
                  hover:brightness-110
                  p-1.5
                  rounded-full
                  cursor-pointer
                  shadow-lg
                "
              >
                {uploadingAvatar ? (
                  <Loader2
                    className="
                      w-3.5
                      h-3.5
                      animate-spin
                      text-white
                    "
                  />
                ) : (
                  <Camera
                    className="
                      w-3.5
                      h-3.5
                      text-white
                    "
                  />
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            )}
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => void handleGenerateProfileImage('avatar')}
                disabled={generatingImage !== null}
                title="توليد صورة بروفايل بالذكاء الاصطناعي"
                aria-label="توليد صورة بروفايل بالذكاء الاصطناعي"
                className="absolute bottom-0 left-0 grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-[var(--accent)] text-[var(--accent-foreground)] shadow-lg disabled:opacity-50"
              >
                {generatingImage === 'avatar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WandSparkles className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>

          {/* الاسم */}

          <div className="flex-1 min-w-0">

            <div className="flex items-center gap-2">

              <h1
                className="
                  text-base
                  font-bold
                  text-white
                  truncate
                "
              >
                {profile.full_name ||
                  profile.username}
              </h1>

              <span
                className="
                  bg-[var(--accent)]/10
                  text-[var(--accent)]
                  text-[10px]
                  px-2
                  py-0.5
                  rounded-full
                  font-mono
                "
              >
                {(typeof profile.display_id === 'string' && profile.display_id.trim()
                  ? profile.display_id.trim()
                  : formatDisplayId(typeof profile.display_id === 'number' ? profile.display_id : null)) || <Handle username={profile.username} />}
              </span>

            </div>

            <p
              className="
                text-xs
                text-neutral-400
              "
            >
              <Handle username={profile.username} />
            </p>

            {profile.bio && (
              <p
                className="
                  text-xs
                  text-neutral-300
                  mt-2
                  leading-relaxed
                "
              >
                {profile.bio}
              </p>
            )}

            {profileBadges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profileBadges.map((badge) => (
                  <span key={badge.id} className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* ==================================
            Stats
        ================================== */}

        <div
          className="
            grid
            grid-cols-3
            gap-2
            mt-5
            pt-4
            border-t
            border-white/10
            text-center
          "
        >

          <div>
            <span
              className="
                block
                text-sm
                font-bold
                text-white
              "
            >
              {userPosts.length}
            </span>

            <span
              className="
                text-[10px]
                text-neutral-400
              "
            >
              منشورات
            </span>
          </div>

          <div>
            <span
              className="
                block
                text-sm
                font-bold
                text-white
              "
            >
              {followersCount}
            </span>

            <span
              className="
                text-[10px]
                text-neutral-400
              "
            >
              متابعون
            </span>
          </div>

          <div>
            <span
              className="
                block
                text-sm
                font-bold
                text-white
              "
            >
              {followingCount}
            </span>

            <span
              className="
                text-[10px]
                text-neutral-400
              "
            >
              متابَعون
            </span>
          </div>

        </div>

        {/* ==================================
            Buttons
        ================================== */}

        <div
          className="
            flex
            gap-2
            mt-4
          "
        >

          {isOwnProfile ? (
            <button
              onClick={() =>
                setIsEditing(
                  (previous) => !previous
                )
              }
              className="
                flex-1
                bg-neutral-800
                hover:bg-neutral-700
                py-2.5
                rounded-xl
                text-xs
                font-semibold
                flex
                items-center
                justify-center
                gap-2
                border
                border-white/10
              "
            >
              <Edit3
                className="
                  w-4
                  h-4
                  text-[var(--accent)]
                "
              />

              تعديل الملف الشخصي
            </button>
          ) : (
            <>
              <button
                onClick={() =>
                  void handleToggleFollow()
                }
                disabled={followLoading}
                className={`
                  flex-1
                  py-2.5
                  rounded-xl
                  text-xs
                  font-semibold
                  flex
                  items-center
                  justify-center
                  gap-2
                  transition-all

                  ${
                    isFollowing
                      ? `
                        bg-neutral-800
                        text-neutral-300
                        border
                        border-white/10
                      `
                      : `
                        bg-[var(--accent)]
                        hover:brightness-110
                        text-white
                      `
                  }
                `}
              >

                {followLoading ? (
                  <Loader2
                    className="
                      w-4
                      h-4
                      animate-spin
                    "
                  />
                ) : isFollowing ? (
                  <>
                    <UserCheck
                      className="
                        w-4
                        h-4
                        text-[var(--accent)]
                      "
                    />

                    مُتابع
                  </>
                ) : (
                  <>
                    <UserPlus
                      className="w-4 h-4"
                    />

                    متابعة
                  </>
                )}

              </button>

              <button
                onClick={() =>
                  navigate(
                    `/chat/${targetUserId}`
                  )
                }
                className="
                  bg-neutral-800
                  hover:bg-neutral-700
                  px-4
                  py-2.5
                  rounded-xl
                  text-xs
                  font-semibold
                  flex
                  items-center
                  justify-center
                  gap-1.5
                  border
                  border-white/10
                "
              >
                <MessageSquare
                  className="
                    w-4
                    h-4
                    text-[var(--accent)]
                  "
                />

                رسالة
              </button>
            </>
          )}

        </div>
      </div>

      {/* ======================================
          Edit Profile
      ====================================== */}

      {isEditing && isOwnProfile && (
        <div
          className="
            bg-neutral-900
            border
            border-white/10
            rounded-2xl
            p-4
            space-y-4
          "
        >

          <div
            className="
              flex
              justify-between
              items-center
              pb-2
              border-b
              border-white/10
            "
          >
            <span
              className="
                text-xs
                font-bold
                text-white
              "
            >
              تعديل المعلومات
            </span>

            <button
              onClick={() =>
                setIsEditing(false)
              }
              className="
                text-neutral-400
                hover:text-white
              "
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* الاسم */}

          <div className="space-y-2">

            <label
              className="
                text-[10px]
                text-neutral-400
                block
              "
            >
              الاسم الكامل
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(event) =>
                setFullName(
                  event.target.value
                )
              }
              className="
                w-full
                bg-neutral-950
                border
                border-white/10
                rounded-xl
                px-3
                py-2.5
                text-xs
                text-white
                focus:outline-none
                focus:border-[var(--accent)]
              "
            />

          </div>

          {/* Bio */}

          <div className="space-y-2">

            <label
              className="
                text-[10px]
                text-neutral-400
                block
              "
            >
              السيرة الذاتية
            </label>

            <textarea
              value={bio}
              onChange={(event) =>
                setBio(
                  event.target.value
                )
              }
              className="
                w-full
                bg-neutral-950
                border
                border-white/10
                rounded-xl
                px-3
                py-2.5
                text-xs
                text-white
                focus:outline-none
                focus:border-[var(--accent)]
                resize-none
                h-24
              "
            />

          </div>

          {/* Save */}

          <button
            onClick={() =>
              void handleUpdateProfile()
            }
            className="
              w-full
              bg-[var(--accent)]
              hover:brightness-110
              py-2.5
              rounded-xl
              text-xs
              font-bold
              flex
              items-center
              justify-center
              gap-2
              text-white
            "
          >
            <Check className="w-4 h-4" />

            حفظ التغييرات
          </button>

        </div>
      )}

      {/* ======================================
          Posts
      ====================================== */}

      <div
        className="
          bg-neutral-900
          border
          border-white/10
          rounded-2xl
          overflow-hidden
        "
      >

        <div
          className="
            flex
            items-center
            gap-2
            px-4
            py-3
            border-b
            border-white/10
          "
        >
          <Grid
            className="
              w-4
              h-4
              text-[var(--accent)]
            "
          />

          <span
            className="
              text-xs
              font-bold
              text-white
            "
          >
            المنشورات
          </span>
        </div>

        {userPosts.length === 0 ? (
          <div
            className="
              py-16
              text-center
              text-neutral-500
            "
          >
            <Grid
              className="
                w-8
                h-8
                mx-auto
                mb-3
                opacity-40
              "
            />

            <p className="text-xs">
              لا توجد منشورات بعد
            </p>
          </div>
        ) : (
          <div
            className="
              grid
              grid-cols-2
              sm:grid-cols-3
              gap-1
            "
          >
            {userPosts.map((post) => (
              <div
                key={post.id}
                className="
                  aspect-square
                  bg-neutral-950
                  overflow-hidden
                  relative
                "
              >
                {post.audio_url ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-emerald-950 to-neutral-950 p-3">
                    <Music2 className="h-8 w-8 text-[var(--accent)]" />
                    <audio src={post.audio_url} controls className="w-full" />
                  </div>
                ) : post.video_url ? (
                  <video
                    src={post.video_url}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (post.media_urls?.[0] || post.image_url) ? (
                  <img
                    src={post.media_urls?.[0] || post.image_url || undefined}
                    alt={
                      post.caption ||
                      'Post'
                    }
                    className="
                      w-full
                      h-full
                      object-cover
                    "
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="
                      w-full
                      h-full
                      flex
                      items-center
                      justify-center
                      p-4
                      text-center
                      text-neutral-400
                      text-xs
                    "
                  >
                    {post.caption ||
                      'منشور'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

    </div>
  );
}
