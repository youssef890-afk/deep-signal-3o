-- Additive repair for the Deep-Signal profile, messaging, game, and voice-note
-- schema. Safe to re-run; no existing rows or storage objects are deleted.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  cover_url text,
  display_id integer
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_id integer;
CREATE SEQUENCE IF NOT EXISTS public.profiles_display_id_seq;
UPDATE public.profiles
SET display_id = nextval('public.profiles_display_id_seq')
WHERE display_id IS NULL;
SELECT setval(
  'public.profiles_display_id_seq',
  GREATEST(COALESCE((SELECT MAX(display_id) FROM public.profiles), 0), 1),
  true
);
ALTER TABLE public.profiles
  ALTER COLUMN display_id SET DEFAULT nextval('public.profiles_display_id_seq');
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE display_id IS NULL) THEN
    ALTER TABLE public.profiles ALTER COLUMN display_id SET NOT NULL;
  END IF;
END
$$;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_display_id_key
ON public.profiles (display_id);
GRANT USAGE, SELECT ON SEQUENCE public.profiles_display_id_seq TO authenticated;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'audio')),
  audio_url text,
  audio_duration_ms integer
);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text'
  CHECK (message_type IN ('text', 'audio'));
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_duration_ms integer;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at);

DROP POLICY IF EXISTS profiles_read_all ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

DO $$
BEGIN
  IF to_regprocedure('public.is_user_blocked(uuid)') IS NOT NULL THEN
    EXECUTE $policy$
      CREATE POLICY profiles_read_all
      ON public.profiles FOR SELECT TO authenticated
      USING (id = (SELECT auth.uid()) OR NOT public.is_user_blocked(id))
    $policy$;
  ELSE
    EXECUTE $policy$
      CREATE POLICY profiles_read_all
      ON public.profiles FOR SELECT TO authenticated USING (true)
    $policy$;
  END IF;
END
$$;

CREATE POLICY profiles_insert_own
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY profiles_update_own
ON public.profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS messages_read_own ON public.messages;
DROP POLICY IF EXISTS "messages_read_own" ON public.messages;
DROP POLICY IF EXISTS messages_read_all ON public.messages;
DROP POLICY IF EXISTS "messages_read_all" ON public.messages;
DO $$
BEGIN
  IF to_regprocedure('public.is_user_blocked(uuid)') IS NOT NULL THEN
    EXECUTE $policy$
      CREATE POLICY messages_read_own
      ON public.messages FOR SELECT TO authenticated
      USING (
        (
          (SELECT auth.uid()) = sender_id
          OR (SELECT auth.uid()) = receiver_id
        )
        AND NOT public.is_user_blocked(
          CASE
            WHEN (SELECT auth.uid()) = sender_id THEN receiver_id
            ELSE sender_id
          END
        )
      )
    $policy$;
  ELSE
    EXECUTE $policy$
      CREATE POLICY messages_read_own
      ON public.messages FOR SELECT TO authenticated
      USING (
        (SELECT auth.uid()) = sender_id
        OR (SELECT auth.uid()) = receiver_id
      )
    $policy$;
  END IF;
END
$$;

GRANT SELECT, INSERT ON public.messages TO authenticated;
REVOKE UPDATE ON public.messages FROM anon, authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;

CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_views_not_self CHECK (profile_id <> viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_views_profile_created
ON public.profile_views (profile_id, created_at DESC);
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_views_insert_own ON public.profile_views;
DROP POLICY IF EXISTS profile_views_read_own ON public.profile_views;
DO $$
BEGIN
  IF to_regprocedure('public.is_user_blocked(uuid)') IS NOT NULL THEN
    EXECUTE $policy$
      CREATE POLICY profile_views_insert_own
      ON public.profile_views FOR INSERT TO authenticated
      WITH CHECK (
        viewer_id = (SELECT auth.uid())
        AND NOT public.is_user_blocked(profile_id)
      )
    $policy$;
  ELSE
    EXECUTE $policy$
      CREATE POLICY profile_views_insert_own
      ON public.profile_views FOR INSERT TO authenticated
      WITH CHECK (viewer_id = (SELECT auth.uid()))
    $policy$;
  END IF;
END
$$;
CREATE POLICY profile_views_read_own
ON public.profile_views FOR SELECT TO authenticated
USING (profile_id = (SELECT auth.uid()));
GRANT SELECT, INSERT ON public.profile_views TO authenticated;

CREATE TABLE IF NOT EXISTS public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game text NOT NULL DEFAULT 'tic-tac-toe',
  result text NOT NULL CHECK (result IN ('win', 'draw', 'loss')),
  points integer NOT NULL CHECK (points BETWEEN 0 AND 20),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_scores_weekly
ON public.game_scores (created_at DESC, user_id);
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS game_scores_read_authenticated ON public.game_scores;
DROP POLICY IF EXISTS game_scores_insert_own ON public.game_scores;
CREATE POLICY game_scores_read_authenticated
ON public.game_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY game_scores_insert_own
ON public.game_scores FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));
GRANT SELECT, INSERT ON public.game_scores TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_game_stats()
RETURNS TABLE (
  total_points bigint,
  total_games bigint,
  total_wins bigint,
  today_games bigint,
  today_wins bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    COALESCE(SUM(points), 0)::bigint,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE result = 'win')::bigint,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()))::bigint,
    COUNT(*) FILTER (
      WHERE result = 'win' AND created_at >= date_trunc('day', now())
    )::bigint
  FROM public.game_scores
  WHERE user_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_my_game_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_game_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  base_username text;
  candidate text;
  attempt integer := 0;
  inserted_rows integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  base_username := lower(regexp_replace(
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'username', ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'user'
    ),
    '[^a-z0-9_]', '', 'g'
  ));
  base_username := left(base_username, 24);
  IF char_length(base_username) < 3 THEN
    base_username := 'user';
  END IF;

  LOOP
    candidate := CASE
      WHEN attempt = 0 THEN base_username
      ELSE left(base_username, 18) || '_' || attempt::text
    END;

    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
      NEW.id,
      candidate,
      COALESCE(
        NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
        NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
        ''
      ),
      COALESCE(
        NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', ''),
        NULLIF(NEW.raw_user_meta_data ->> 'picture', '')
      )
    )
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    IF inserted_rows = 1 OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = NEW.id
    ) THEN
      RETURN NEW;
    END IF;

    attempt := attempt + 1;
    IF attempt > 9999 THEN
      RAISE EXCEPTION 'Unable to create a unique profile username for user %', NEW.id;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$
DECLARE
  account record;
  base_username text;
  candidate text;
  attempt integer;
  inserted_rows integer;
BEGIN
  FOR account IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users AS u
    LEFT JOIN public.profiles AS p ON p.id = u.id
    WHERE p.id IS NULL
    ORDER BY u.created_at
  LOOP
    base_username := lower(regexp_replace(
      COALESCE(
        NULLIF(account.raw_user_meta_data ->> 'username', ''),
        NULLIF(split_part(COALESCE(account.email, ''), '@', 1), ''),
        'user'
      ),
      '[^a-z0-9_]', '', 'g'
    ));
    base_username := left(base_username, 24);
    IF char_length(base_username) < 3 THEN
      base_username := 'user';
    END IF;

    attempt := 0;
    LOOP
      candidate := CASE
        WHEN attempt = 0 THEN base_username
        ELSE left(base_username, 18) || '_' || attempt::text
      END;

      INSERT INTO public.profiles (id, username, full_name, avatar_url)
      VALUES (
        account.id,
        candidate,
        COALESCE(
          NULLIF(account.raw_user_meta_data ->> 'full_name', ''),
          NULLIF(account.raw_user_meta_data ->> 'name', ''),
          ''
        ),
        COALESCE(
          NULLIF(account.raw_user_meta_data ->> 'avatar_url', ''),
          NULLIF(account.raw_user_meta_data ->> 'picture', '')
        )
      )
      ON CONFLICT DO NOTHING;

      GET DIAGNOSTICS inserted_rows = ROW_COUNT;
      IF inserted_rows = 1 OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = account.id
      ) THEN
        EXIT;
      END IF;

      attempt := attempt + 1;
      IF attempt > 9999 THEN
        RAISE EXCEPTION 'Unable to backfill profile for user %', account.id;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
VALUES (
  'voice-notes',
  'voice-notes',
  false,
  5242880,
  ARRAY[
    'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav',
    'audio/webm', 'audio/x-m4a'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS voice_notes_insert_sender ON storage.objects;
DROP POLICY IF EXISTS voice_notes_read_participant ON storage.objects;
DROP POLICY IF EXISTS voice_notes_delete_sender ON storage.objects;

DO $$
BEGIN
  IF to_regprocedure('public.is_user_blocked(uuid)') IS NOT NULL THEN
    EXECUTE $policy$
      CREATE POLICY voice_notes_insert_sender
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'voice-notes'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
        AND NOT public.is_user_blocked(((storage.foldername(name))[2])::uuid)
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY voice_notes_read_participant
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'voice-notes'
        AND EXISTS (
          SELECT 1
          FROM public.messages AS message
          WHERE message.message_type = 'audio'
            AND message.audio_url = storage.objects.name
            AND (
              message.sender_id = (SELECT auth.uid())
              OR message.receiver_id = (SELECT auth.uid())
            )
            AND NOT public.is_user_blocked(
              CASE
                WHEN message.sender_id = (SELECT auth.uid()) THEN message.receiver_id
                ELSE message.sender_id
              END
            )
        )
      )
    $policy$;
  ELSE
    EXECUTE $policy$
      CREATE POLICY voice_notes_insert_sender
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'voice-notes'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY voice_notes_read_participant
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'voice-notes'
        AND EXISTS (
          SELECT 1
          FROM public.messages AS message
          WHERE message.message_type = 'audio'
            AND message.audio_url = storage.objects.name
            AND (
              message.sender_id = (SELECT auth.uid())
              OR message.receiver_id = (SELECT auth.uid())
            )
        )
      )
    $policy$;
  END IF;
END
$$;

CREATE POLICY voice_notes_delete_sender
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
