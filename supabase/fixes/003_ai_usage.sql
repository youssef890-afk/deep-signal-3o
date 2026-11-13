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
BEGIN
  IF v_user_id IS NULL OR p_mode IS NULL OR p_mode NOT IN ('signal', 'image', 'speech') THEN
    RETURN false;
  END IF;

  IF p_mode = 'signal' THEN
    INSERT INTO public.jokal_ai_daily_usage AS usage (
      user_id, usage_date, chat_requests, image_requests
    )
    VALUES (v_user_id, (now() AT TIME ZONE 'utc')::date, 1, 0)
    ON CONFLICT (user_id, usage_date) DO UPDATE
      SET chat_requests = usage.chat_requests + 1
      WHERE usage.chat_requests < 20
    RETURNING true INTO v_allowed;
  ELSE
    IF p_mode = 'speech' THEN
      INSERT INTO public.jokal_ai_daily_usage AS usage (
        user_id, usage_date, chat_requests, image_requests, speech_requests
      )
      VALUES (v_user_id, (now() AT TIME ZONE 'utc')::date, 0, 0, 1)
      ON CONFLICT (user_id, usage_date) DO UPDATE
        SET speech_requests = usage.speech_requests + 1
        WHERE usage.speech_requests < 20
      RETURNING true INTO v_allowed;
      RETURN COALESCE(v_allowed, false);
    END IF;

    INSERT INTO public.jokal_ai_daily_usage AS usage (
      user_id, usage_date, chat_requests, image_requests, speech_requests
    )
    VALUES (v_user_id, (now() AT TIME ZONE 'utc')::date, 0, 1, 0)
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
