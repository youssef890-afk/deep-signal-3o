ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS avatar_type text,
  ADD COLUMN IF NOT EXISTS avatar_emoji text,
  ADD COLUMN IF NOT EXISTS pending_avatar_url text,
  ADD COLUMN IF NOT EXISTS avatar_generations_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_avatar_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_avatar_type_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_avatar_type_check
      CHECK (avatar_type IS NULL OR avatar_type IN ('uploaded', 'generated', 'emoji'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_avatar_generations_used_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_avatar_generations_used_check
      CHECK (avatar_generations_used >= 0);
  END IF;
END;
$$;

UPDATE public.profiles
SET avatar_generations_used = 0
WHERE avatar_generations_used IS NULL;

UPDATE public.profiles
SET onboarding_completed = true
WHERE onboarding_completed IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN avatar_generations_used SET DEFAULT 0,
  ALTER COLUMN avatar_generations_used SET NOT NULL,
  ALTER COLUMN onboarding_completed SET DEFAULT false,
  ALTER COLUMN onboarding_completed SET NOT NULL;

CREATE OR REPLACE FUNCTION public.protect_avatar_onboarding_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.avatar_generations_used := 0;
      NEW.last_avatar_generated_at := NULL;
      NEW.pending_avatar_url := NULL;
      NEW.onboarding_completed := false;
    ELSIF NEW.avatar_generations_used IS DISTINCT FROM OLD.avatar_generations_used
       OR NEW.last_avatar_generated_at IS DISTINCT FROM OLD.last_avatar_generated_at
       OR NEW.pending_avatar_url IS DISTINCT FROM OLD.pending_avatar_url
       OR NEW.onboarding_completed IS DISTINCT FROM OLD.onboarding_completed THEN
      RAISE EXCEPTION 'Avatar generation and onboarding fields are server managed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_avatar_onboarding_fields ON public.profiles;
CREATE TRIGGER protect_avatar_onboarding_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_avatar_onboarding_fields();

REVOKE UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (username, full_name, avatar_url, avatar_type, avatar_emoji, bio, cover_url)
ON public.profiles TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatar-temp',
  'avatar-temp',
  false,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS avatar_temp_read_own ON storage.objects;
CREATE POLICY avatar_temp_read_own
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatar-temp' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS avatar_temp_insert_own ON storage.objects;
CREATE POLICY avatar_temp_insert_own
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatar-temp' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS avatar_temp_delete_own ON storage.objects;
CREATE POLICY avatar_temp_delete_own
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatar-temp' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE OR REPLACE FUNCTION public.consume_avatar_generation(target_user_id uuid, generated_avatar_url text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  free_generation_limit CONSTANT integer := 2;
  second_generation_delay CONSTANT interval := interval '7 days';
  used_generations integer;
  last_generated_at timestamptz;
  profile_id uuid;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  SELECT id, avatar_generations_used, last_avatar_generated_at
  INTO profile_id, used_generations, last_generated_at
  FROM public.profiles
  WHERE id = target_user_id
  FOR UPDATE;

  IF profile_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'profile_not_found');
  END IF;

  IF used_generations >= free_generation_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'payment_required');
  END IF;

  IF used_generations = 1 AND (
    last_generated_at IS NULL
    OR last_generated_at + second_generation_delay > now()
  ) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'cooldown',
      'available_at', last_generated_at + second_generation_delay
    );
  END IF;

  UPDATE public.profiles
  SET avatar_generations_used = used_generations + 1,
      last_avatar_generated_at = now(),
      pending_avatar_url = CASE WHEN onboarding_completed = false THEN generated_avatar_url ELSE pending_avatar_url END
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'generations_used', used_generations + 1,
    'last_generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_avatar_generation(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_avatar_generation(uuid, text) TO service_role;
