CREATE OR REPLACE FUNCTION public.can_access_deep_signal_realtime_topic(target_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid := auth.uid();
  topic_parts text[];
  room_text text;
  parsed_room_id uuid;
BEGIN
  IF caller_id IS NULL OR target_topic IS NULL THEN
    RETURN false;
  END IF;

  IF target_topic IN ('online-users', 'active-rooms-list') THEN
    RETURN true;
  END IF;

  IF target_topic LIKE 'unread:%' THEN
    RETURN substring(target_topic FROM 8) = caller_id::text;
  END IF;

  IF target_topic LIKE 'direct-call:%' THEN
    topic_parts := regexp_match(
      target_topic,
      '^direct-call:([0-9a-fA-F-]{36}):([0-9a-fA-F-]{36})$'
    );
    RETURN topic_parts IS NOT NULL
      AND caller_id::text IN (topic_parts[1], topic_parts[2]);
  END IF;

  IF target_topic LIKE 'chat-%' THEN
    topic_parts := regexp_match(
      target_topic,
      '^chat-([0-9a-fA-F-]{36})-([0-9a-fA-F-]{36})-[0-9]+$'
    );
    RETURN topic_parts IS NOT NULL
      AND caller_id::text IN (topic_parts[1], topic_parts[2]);
  END IF;

  IF target_topic LIKE 'ttt:%' THEN
    RETURN target_topic ~ '^ttt:[A-Z0-9]{12}$';
  END IF;

  IF target_topic LIKE 'room-audio:%' THEN
    room_text := substring(target_topic FROM 12);
  ELSIF target_topic LIKE 'room-status-%' THEN
    room_text := substring(target_topic FROM 13);
  ELSIF target_topic LIKE 'room:%' THEN
    room_text := substring(target_topic FROM 6);
  ELSIF target_topic LIKE 'voice-card-clash:%' THEN
    RETURN public.is_voice_card_clash_member(substring(target_topic FROM 18));
  ELSE
    RETURN false;
  END IF;

  BEGIN
    parsed_room_id := room_text::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  RETURN EXISTS (
    SELECT 1
    FROM public.rooms AS room
    LEFT JOIN public.room_members AS member
      ON member.room_id = room.id
     AND member.user_id = caller_id
    WHERE room.id = parsed_room_id
      AND (room.created_by = caller_id OR member.user_id IS NOT NULL)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_deep_signal_realtime_topic(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_deep_signal_realtime_topic(text) TO authenticated;

DROP POLICY IF EXISTS deep_signal_private_realtime_select ON realtime.messages;
CREATE POLICY deep_signal_private_realtime_select
ON realtime.messages FOR SELECT TO authenticated
USING (public.can_access_deep_signal_realtime_topic(realtime.topic()));

DROP POLICY IF EXISTS deep_signal_private_realtime_insert ON realtime.messages;
CREATE POLICY deep_signal_private_realtime_insert
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (public.can_access_deep_signal_realtime_topic(realtime.topic()));
