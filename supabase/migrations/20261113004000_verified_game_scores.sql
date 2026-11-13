ALTER TABLE public.game_scores
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE INDEX IF NOT EXISTS game_scores_verified_weekly_idx
ON public.game_scores (created_at DESC, user_id)
WHERE verified_at IS NOT NULL;

DROP POLICY IF EXISTS game_scores_read_authenticated ON public.game_scores;
CREATE POLICY game_scores_read_authenticated
ON public.game_scores
FOR SELECT TO authenticated
USING (verified_at IS NOT NULL);

REVOKE INSERT, UPDATE, DELETE ON public.game_scores FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.game_scores TO authenticated;

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
    COUNT(*) FILTER (WHERE result = 'win' AND created_at >= date_trunc('day', now()))::bigint
  FROM public.game_scores
  WHERE user_id = (SELECT auth.uid())
    AND verified_at IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_my_game_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_game_stats() TO authenticated;
