-- Keep quota and AI usage mutations server-only. Edge Functions verify the
-- caller's JWT first, then use the service-role client to call these RPCs.
-- The row owner is passed from that verified identity and is never accepted
-- from a browser-facing RPC call.

DROP FUNCTION IF EXISTS public.consume_ai_quota(text, integer, integer, text, text, text);
DROP FUNCTION IF EXISTS public.finalize_ai_usage(uuid, integer, integer, numeric, integer, text);

CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  p_user_id uuid,
  p_bucket text,
  p_limit integer,
  p_window_seconds integer,
  p_request_type text,
  p_provider text,
  p_model text
)
RETURNS TABLE (allowed boolean, remaining integer, reset_at timestamptz, usage_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  caller_id uuid := p_user_id;
  bucket_name text := COALESCE(NULLIF(p_bucket, ''), 'default');
  safe_limit integer := LEAST(GREATEST(COALESCE(p_limit, 0), 0), 1000);
  safe_window integer := LEAST(GREATEST(COALESCE(p_window_seconds, 60), 1), 86400);
  window_start timestamptz;
  used_count integer;
  reserved_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' OR caller_id IS NULL THEN
    RAISE EXCEPTION 'AI quota RPC is server-only' USING ERRCODE = '42501';
  END IF;

  IF bucket_name NOT IN ('ai-assistant-text', 'ai-assistant-image', 'jokal-chat') THEN
    RAISE EXCEPTION 'Invalid AI quota bucket' USING ERRCODE = '22023';
  END IF;

  IF safe_limit = 0 THEN
    RETURN QUERY SELECT false, 0, now() + make_interval(secs => safe_window), NULL::uuid;
    RETURN;
  END IF;

  window_start := now() - make_interval(secs => safe_window);

  -- Serialize requests for one account and bucket so parallel calls cannot
  -- all observe the same pre-request count and exceed the configured limit.
  PERFORM pg_advisory_xact_lock(hashtext(caller_id::text), hashtext(bucket_name));

  SELECT count(*) INTO used_count
  FROM public.ai_usage AS usage
  WHERE usage.user_id = caller_id
    AND usage.bucket = bucket_name
    AND usage.created_at >= window_start;

  -- Do not write a row for a denied request; otherwise a caller could grow
  -- the ledger indefinitely by repeatedly hitting an already exhausted limit.
  IF used_count >= safe_limit THEN
    RETURN QUERY
      SELECT false, 0, window_start + make_interval(secs => safe_window), NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.ai_usage (user_id, bucket, request_type, provider, model, status)
  VALUES (
    caller_id,
    bucket_name,
    LEFT(COALESCE(NULLIF(p_request_type, ''), 'unknown'), 64),
    LEFT(COALESCE(NULLIF(p_provider, ''), 'unknown'), 64),
    LEFT(COALESCE(NULLIF(p_model, ''), 'unknown'), 128),
    'reserved'
  )
  RETURNING id INTO reserved_id;

  RETURN QUERY
    SELECT true, safe_limit - used_count - 1,
           window_start + make_interval(secs => safe_window), reserved_id;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota(uuid, text, integer, integer, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(uuid, text, integer, integer, text, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_ai_usage(
  p_user_id uuid,
  p_usage_id uuid,
  p_input_tokens integer,
  p_output_tokens integer,
  p_estimated_cost_usd numeric,
  p_latency_ms integer,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'AI usage finalization is server-only' USING ERRCODE = '42501';
  END IF;

  UPDATE public.ai_usage
  SET input_tokens = GREATEST(COALESCE(p_input_tokens, 0), 0),
      output_tokens = GREATEST(COALESCE(p_output_tokens, 0), 0),
      total_tokens = GREATEST(COALESCE(p_input_tokens, 0), 0)
                    + GREATEST(COALESCE(p_output_tokens, 0), 0),
      estimated_cost_usd = GREATEST(COALESCE(p_estimated_cost_usd, 0), 0),
      latency_ms = GREATEST(COALESCE(p_latency_ms, 0), 0),
      status = CASE WHEN p_status IN ('succeeded', 'failed') THEN p_status ELSE 'failed' END
  WHERE id = p_usage_id
    AND user_id = p_user_id
    AND status = 'reserved';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_ai_usage(uuid, uuid, integer, integer, numeric, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_ai_usage(uuid, uuid, integer, integer, numeric, integer, text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
