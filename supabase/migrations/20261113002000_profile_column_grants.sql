REVOKE INSERT, UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;

GRANT INSERT (id, username, full_name, avatar_url)
ON public.profiles TO authenticated;

GRANT UPDATE (
  username,
  full_name,
  avatar_url,
  avatar_type,
  avatar_emoji,
  avatar_config,
  bio,
  cover_url
)
ON public.profiles TO authenticated;
