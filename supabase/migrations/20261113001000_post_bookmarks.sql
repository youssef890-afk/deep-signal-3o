CREATE TABLE IF NOT EXISTS public.post_bookmarks (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS post_bookmarks_user_created_idx
ON public.post_bookmarks (user_id, created_at DESC);

ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_bookmarks_read_own ON public.post_bookmarks;
CREATE POLICY post_bookmarks_read_own
ON public.post_bookmarks FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS post_bookmarks_insert_own ON public.post_bookmarks;
CREATE POLICY post_bookmarks_insert_own
ON public.post_bookmarks FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS post_bookmarks_delete_own ON public.post_bookmarks;
CREATE POLICY post_bookmarks_delete_own
ON public.post_bookmarks FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON public.post_bookmarks FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.post_bookmarks TO authenticated;
