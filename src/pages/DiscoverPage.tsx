import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import AnimatedAvatar from '@/components/AnimatedAvatar';
import PostCard, { type PostCardPost } from '@/components/PostCard';
import { motion } from 'framer-motion';
import { UserPlus, UserCheck, MessageCircle, Loader2, Users } from 'lucide-react';
import type { Profile } from '@/types';
import { getStoredLanguage, translate } from '@/lib/i18n';

interface SuggestedUser extends Profile {
  isFollowing: boolean;
}

export default function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const t = (key: Parameters<typeof translate>[1]) => translate(getStoredLanguage(), key);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoadError('');
      try {
        const { data: following, error: followingError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        if (followingError) throw followingError;

        const followingIds = new Set((following || []).map((f) => f.following_id));
        followingIds.add(user.id);

        const [profilesResult, postsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('posts')
            .select('id, user_id, post_type, image_url, video_url, audio_url, caption, created_at, likes(count), comments_count:comments(count), comments(id, user_id, content, created_at, profiles:profiles(username)), profiles:profiles(id, username, avatar_url)')
            .neq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50),
        ]);
        if (profilesResult.error) throw profilesResult.error;
        if (postsResult.error) throw postsResult.error;

        if (cancelled) return;
        if (!profilesResult.data) throw new Error('Profiles query returned no data.');

        const list: SuggestedUser[] = (profilesResult.data as Profile[])
          .filter((p) => !followingIds.has(p.id))
          .map((p) => ({ ...p, isFollowing: false }));

        const postIds = (postsResult.data ?? []).map((post) => String(post.id));
        const [likesResult, bookmarksResult] = postIds.length
          ? await Promise.all([
            supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
            supabase.from('post_bookmarks').select('post_id').eq('user_id', user.id).in('post_id', postIds),
          ])
          : [{ data: [], error: null }, { data: [], error: null }];
        if (likesResult.error) throw likesResult.error;
        if (bookmarksResult.error) throw bookmarksResult.error;
        if (cancelled) return;
        const likedPostIds = new Set((likesResult.data ?? []).map((like) => String(like.post_id)));
        const savedPostIds = new Set((bookmarksResult.data ?? []).map((bookmark) => String(bookmark.post_id)));
        const discoveredPosts: PostCardPost[] = (postsResult.data ?? [])
          .filter((post) => String(post.user_id) !== user.id)
          .map((post) => {
            const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
            const audioUrl = typeof post.audio_url === 'string' ? post.audio_url : null;
            const videoUrl = typeof post.video_url === 'string' ? post.video_url : null;
            const imageUrl = typeof post.image_url === 'string' ? post.image_url : null;
            const postComments = Array.isArray(post.comments) ? post.comments : [];
            const commentCount = Array.isArray(post.comments_count)
              ? Number(post.comments_count[0]?.count ?? 0)
              : 0;
            const likesCount = Array.isArray(post.likes) ? Number(post.likes[0]?.count ?? 0) : 0;
            return {
              id: String(post.id),
              type: audioUrl ? 'audio' : videoUrl ? 'video' : imageUrl ? 'image' : 'text',
              url: audioUrl ?? videoUrl ?? imageUrl,
              userId: String(post.user_id),
              author: profile && typeof profile.username === 'string' ? profile.username : 'مستخدم',
              avatar: profile && typeof profile.avatar_url === 'string' ? profile.avatar_url : null,
              caption: typeof post.caption === 'string' ? post.caption : null,
              likes: likesCount,
              commentCount,
              likedByCurrentUser: likedPostIds.has(String(post.id)),
              savedByCurrentUser: savedPostIds.has(String(post.id)),
              comments: postComments.map((comment) => {
                const commentProfile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
                return {
                  id: String(comment.id),
                  userId: String(comment.user_id),
                  author: commentProfile?.username ?? 'مستخدم',
                  text: String(comment.content),
                };
              }),
              createdAt: typeof post.created_at === 'string' ? post.created_at : new Date().toISOString(),
            };
          });
        const postById = new Map((postsResult.data ?? []).map((post) => [String(post.id), post]));
        discoveredPosts.sort((first, second) => {
          const firstTime = Date.parse(first.createdAt);
          const secondTime = Date.parse(second.createdAt);
          const dayOrder = Math.floor(secondTime / 86_400_000) - Math.floor(firstTime / 86_400_000);
          if (dayOrder !== 0) return dayOrder;

          const firstFollowed = followingIds.has(first.userId) ? 1 : 0;
          const secondFollowed = followingIds.has(second.userId) ? 1 : 0;
          if (firstFollowed !== secondFollowed) return secondFollowed - firstFollowed;

          const firstRaw = postById.get(first.id);
          const secondRaw = postById.get(second.id);
          const firstComments = Array.isArray(firstRaw?.comments_count) ? Number(firstRaw.comments_count[0]?.count ?? 0) : 0;
          const secondComments = Array.isArray(secondRaw?.comments_count) ? Number(secondRaw.comments_count[0]?.count ?? 0) : 0;
          const engagementOrder = (second.likes + secondComments) - (first.likes + firstComments);
          return engagementOrder || secondTime - firstTime;
        });

        setUsers(list);
        setPosts(discoveredPosts);
      } catch (error) {
        if (cancelled) return;
        console.error('Discover profiles could not be loaded:', error);
        setUsers([]);
        setPosts([]);
        setLoadError(t('discoverLoadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [refreshKey, user]);

  const toggleFollow = async (userId: string) => {
    if (!user) return;
    const isFollowing = followingMap[userId];

    setFollowingMap((m) => ({ ...m, [userId]: !isFollowing }));

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: userId });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 text-center text-sm leading-6 text-[var(--error)]">
        {loadError}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-6 h-6 text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-white">اكتشف</h1>
        </div>
        <p className="text-sm text-white/50">منشورات جديدة وحسابات تستحق المتابعة</p>
      </div>

      <section className="mb-8" aria-labelledby="discover-posts-title">
        <h2 id="discover-posts-title" className="mb-3 text-lg font-bold text-white">منشورات حديثة</h2>
        {posts.length ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id ?? null}
                currentUsername="أنت"
                onEngagementChanged={() => setRefreshKey((key) => key + 1)}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-white/45">ما كايناش منشورات جديدة دابا.</p>
        )}
      </section>

      <h2 className="mb-3 text-lg font-bold text-white">أشخاص مقترحون</h2>
      {users.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl bg-white/5 border border-white/10 p-10 text-center"
        >
          <Users className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">ما كاينش مستخدمين جدد</h3>
          <p className="text-sm text-white/50">راك تابع كل المستخدمين المتوفرين</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {users.map((u, i) => {
            const isFollowing = followingMap[u.id] ?? false;
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-all"
              >
                <AnimatedAvatar
                  src={u.avatar_url}
                  name={u.full_name || u.username}
                  size="md"
                  onClick={() => navigate(`/profile/${u.id}`)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{u.username}</p>
                  {u.full_name && (
                    <p className="text-xs text-white/50 truncate">{u.full_name}</p>
                  )}
                </div>

                <button
                  onClick={() => toggleFollow(u.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    isFollowing
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:brightness-110'
                  }`}
                >
                  {isFollowing ? (
                    <><UserCheck className="w-4 h-4" /> متابَع</>
                  ) : (
                    <><UserPlus className="w-4 h-4" /> متابعة</>
                  )}
                </button>

                <button
                  onClick={() => navigate(`/chat/${u.id}`)}
                  className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
