ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS capacity smallint NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS invite_code text,
  ADD COLUMN IF NOT EXISTS host_last_seen_at timestamptz NOT NULL DEFAULT now();

UPDATE public.rooms
SET invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
WHERE invite_code IS NULL;

ALTER TABLE public.rooms
  ALTER COLUMN invite_code SET DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS rooms_invite_code_key
ON public.rooms (invite_code);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.rooms'::regclass
      AND conname = 'rooms_capacity_range'
  ) THEN
    ALTER TABLE public.rooms
      ADD CONSTRAINT rooms_capacity_range CHECK (capacity BETWEEN 2 AND 12);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.enforce_room_member_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  room_capacity smallint;
  current_members integer;
BEGIN
  IF NEW.role = 'owner' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.rooms
      WHERE id = NEW.room_id
        AND created_by = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Only the room creator may be its owner';
    END IF;
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.room_members
    WHERE room_id = NEW.room_id
      AND user_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT capacity
  INTO room_capacity
  FROM public.rooms
  WHERE id = NEW.room_id
    AND is_active
  FOR UPDATE;

  IF room_capacity IS NULL THEN
    RAISE EXCEPTION 'Room is not active';
  END IF;

  SELECT count(*)
  INTO current_members
  FROM public.room_members
  WHERE room_id = NEW.room_id;

  IF current_members >= room_capacity THEN
    RAISE EXCEPTION 'Room is full';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_room_member_capacity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS room_members_enforce_capacity ON public.room_members;
CREATE TRIGGER room_members_enforce_capacity
BEFORE INSERT ON public.room_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_room_member_capacity();

CREATE OR REPLACE FUNCTION public.host_heartbeat()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.rooms
  SET host_last_seen_at = now()
  WHERE created_by = auth.uid()
    AND is_active;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_stale_rooms()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  closed_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.rooms
  SET is_active = false
  WHERE is_active
    AND host_last_seen_at < now() - interval '75 seconds';

  GET DIAGNOSTICS closed_count = ROW_COUNT;
  RETURN closed_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.deep_signal_close_room(target_room_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.rooms
  SET is_active = false
  WHERE id = target_room_id
    AND created_by = auth.uid()
    AND is_active;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.host_heartbeat() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.close_stale_rooms() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.deep_signal_close_room(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.host_heartbeat() TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_stale_rooms() TO authenticated;
GRANT EXECUTE ON FUNCTION public.deep_signal_close_room(uuid) TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.rooms FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.rooms TO authenticated;
GRANT INSERT (name, description, created_by, capacity) ON public.rooms TO authenticated;

CREATE TABLE IF NOT EXISTS public.jokal_ai_daily_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  chat_requests integer NOT NULL DEFAULT 0 CHECK (chat_requests >= 0),
  image_requests integer NOT NULL DEFAULT 0 CHECK (image_requests >= 0),
  speech_requests integer NOT NULL DEFAULT 0 CHECK (speech_requests >= 0),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.jokal_ai_daily_usage
  ADD COLUMN IF NOT EXISTS speech_requests integer NOT NULL DEFAULT 0
  CHECK (speech_requests >= 0);

ALTER TABLE public.jokal_ai_daily_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jokal_ai_daily_usage FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_jokal_ai_quota(p_mode text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_allowed boolean;
  v_today date := (now() AT TIME ZONE 'utc')::date;
BEGIN
  IF v_user_id IS NULL OR p_mode IS NULL OR p_mode NOT IN ('signal', 'image', 'speech') THEN
    RETURN false;
  END IF;

  IF p_mode = 'signal' THEN
    INSERT INTO public.jokal_ai_daily_usage AS usage (
      user_id, usage_date, chat_requests, image_requests
    )
    VALUES (v_user_id, v_today, 1, 0)
    ON CONFLICT (user_id, usage_date) DO UPDATE
      SET chat_requests = usage.chat_requests + 1
      WHERE usage.chat_requests < 20
    RETURNING true INTO v_allowed;
  ELSIF p_mode = 'speech' THEN
    INSERT INTO public.jokal_ai_daily_usage AS usage (
      user_id, usage_date, chat_requests, image_requests, speech_requests
    )
    VALUES (v_user_id, v_today, 0, 0, 1)
    ON CONFLICT (user_id, usage_date) DO UPDATE
      SET speech_requests = usage.speech_requests + 1
      WHERE usage.speech_requests < 20
    RETURNING true INTO v_allowed;
  ELSE
    INSERT INTO public.jokal_ai_daily_usage AS usage (
      user_id, usage_date, chat_requests, image_requests, speech_requests
    )
    VALUES (v_user_id, v_today, 0, 1, 0)
    ON CONFLICT (user_id, usage_date) DO UPDATE
      SET image_requests = usage.image_requests + 1
      WHERE usage.image_requests < 5
    RETURNING true INTO v_allowed;
  END IF;

  RETURN COALESCE(v_allowed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_jokal_ai_quota(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_jokal_ai_quota(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
