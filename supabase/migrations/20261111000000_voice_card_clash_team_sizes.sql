ALTER TABLE public.voice_card_clash_rooms
  ADD COLUMN team_size smallint NOT NULL DEFAULT 4
  CHECK (team_size BETWEEN 2 AND 4);

DROP FUNCTION public.create_voice_card_clash_room(text);

CREATE FUNCTION public.create_voice_card_clash_room(target_code text, target_team_size smallint)
RETURNS smallint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT auth.uid());
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF target_code !~ '^[A-Z0-9]{6}$' THEN
    RAISE EXCEPTION 'Invalid room code';
  END IF;

  IF target_team_size NOT BETWEEN 2 AND 4 THEN
    RAISE EXCEPTION 'Invalid team size';
  END IF;

  INSERT INTO public.voice_card_clash_rooms (room_code, host_id, team_size)
  VALUES (target_code, current_user_id, target_team_size);

  INSERT INTO public.voice_card_clash_players (room_code, user_id, seat)
  VALUES (target_code, current_user_id, 0);

  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_voice_card_clash_room(target_code text)
RETURNS smallint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT auth.uid());
  configured_team_size smallint;
  assigned_seat smallint;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT team_size INTO configured_team_size
  FROM public.voice_card_clash_rooms
  WHERE room_code = target_code AND is_active
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  DELETE FROM public.voice_card_clash_players
  WHERE room_code = target_code
    AND user_id <> current_user_id
    AND last_seen_at < now() - interval '45 seconds';

  SELECT seat INTO assigned_seat
  FROM public.voice_card_clash_players
  WHERE room_code = target_code AND user_id = current_user_id;

  IF FOUND THEN
    UPDATE public.voice_card_clash_players
    SET last_seen_at = now()
    WHERE room_code = target_code AND user_id = current_user_id;
    RETURN assigned_seat;
  END IF;

  SELECT candidate.seat INTO assigned_seat
  FROM generate_series(0, configured_team_size * 2 - 1) AS candidate(seat)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.voice_card_clash_players p
    WHERE p.room_code = target_code AND p.seat = candidate.seat
  )
  ORDER BY candidate.seat
  LIMIT 1;

  IF assigned_seat IS NULL THEN
    RAISE EXCEPTION 'Room is full';
  END IF;

  INSERT INTO public.voice_card_clash_players (room_code, user_id, seat)
  VALUES (target_code, current_user_id, assigned_seat);

  RETURN assigned_seat;
END;
$$;

REVOKE ALL ON FUNCTION public.create_voice_card_clash_room(text, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_voice_card_clash_room(text, smallint) TO authenticated;
REVOKE ALL ON FUNCTION public.join_voice_card_clash_room(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_voice_card_clash_room(text) TO authenticated;
