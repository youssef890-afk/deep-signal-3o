/*
  Deep Signal — database audit security hotfix

  Prepared locally on 2026-11-15 after read-only inspection of production.
  Do not apply until the local and remote migration ledgers have been reconciled.
  This migration does not drop application tables or stored objects.
*/

-- The old public SECURITY DEFINER sweeper accepted a caller-controlled grace
-- period, marked rooms inactive, and deleted their membership rows. Keep the
-- existing RPC signature for compatibility, but use a server-chosen timeout,
-- require an authenticated caller, and retain membership history.
CREATE OR REPLACE FUNCTION public.close_stale_rooms(grace interval DEFAULT interval '45 seconds')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  UPDATE public.rooms
  SET is_active = false
  WHERE is_active
    AND host_last_seen < pg_catalog.now() - interval '60 seconds';
END;
$$;

REVOKE ALL ON FUNCTION public.close_stale_rooms(interval)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_stale_rooms(interval)
TO authenticated;

-- Use the bookmarks relation that actually exists in production. Keep the old
-- post_bookmarks table untouched if an environment already created it.
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_posts_user_id_post_id_key UNIQUE (user_id, post_id)
);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow individual insert/delete for saved posts" ON public.saved_posts;
DROP POLICY IF EXISTS saved_posts_owner_access ON public.saved_posts;
CREATE POLICY saved_posts_owner_access
ON public.saved_posts FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON public.saved_posts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.saved_posts TO authenticated;
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id
ON public.saved_posts (post_id);

-- Remove broad uploads to arbitrary users' object paths. App uploads already
-- use <authenticated-user-id>/... for posts and avatars.
DROP POLICY IF EXISTS "Authenticated Upload Posts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS posts_bucket_insert ON storage.objects;
DROP POLICY IF EXISTS posts_bucket_update ON storage.objects;
DROP POLICY IF EXISTS posts_bucket_delete ON storage.objects;
DROP POLICY IF EXISTS avatars_bucket_insert ON storage.objects;
DROP POLICY IF EXISTS avatars_bucket_update ON storage.objects;
DROP POLICY IF EXISTS avatars_bucket_delete ON storage.objects;

CREATE POLICY posts_bucket_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'posts'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY posts_bucket_update
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'posts'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'posts'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY posts_bucket_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'posts'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY avatars_bucket_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY avatars_bucket_update
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY avatars_bucket_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- The client stores voice notes as <sender-id>/<receiver-id>/<uuid> and asks
-- Storage for a short-lived signed URL. Keep the bucket private and limit reads
-- to those two path participants.
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS voice_notes_insert_sender ON storage.objects;
DROP POLICY IF EXISTS voice_notes_read_participant ON storage.objects;
DROP POLICY IF EXISTS voice_notes_delete_sender ON storage.objects;

CREATE POLICY voice_notes_insert_sender
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY voice_notes_read_participant
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR (storage.foldername(name))[2] = (SELECT auth.uid())::text
  )
);

CREATE POLICY voice_notes_delete_sender
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
