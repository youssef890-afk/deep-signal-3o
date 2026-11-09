ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS capacity smallint NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS invite_code text;

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
SET search_path = public, pg_temp
AS $$
DECLARE
  active_room_id uuid;
  room_capacity smallint;
  current_members integer;
BEGIN
  IF NEW.role = 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = NEW.room_id AND created_by = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Only the room creator may be its owner';
    END IF;
    RETURN NEW;
  END IF;

  SELECT id, capacity
  INTO active_room_id, room_capacity
  FROM public.rooms
  WHERE id = NEW.room_id AND is_active
  FOR UPDATE;

  IF active_room_id IS NULL THEN
    RAISE EXCEPTION 'Room is not active';
  END IF;

  SELECT count(*) INTO current_members
  FROM public.room_members
  WHERE room_id = NEW.room_id;

  IF current_members >= room_capacity THEN
    RAISE EXCEPTION 'Room is full';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_room_member_capacity() FROM PUBLIC, anon, authenticated;
