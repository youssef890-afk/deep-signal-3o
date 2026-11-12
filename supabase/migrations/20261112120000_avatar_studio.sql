-- Avatar Studio: persist the editable design separately from the rendered profile image.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_config jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_avatar_config_object_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_avatar_config_object_check
      CHECK (avatar_config IS NULL OR jsonb_typeof(avatar_config) = 'object');
  END IF;
END;
$$;

-- Existing row-level policy still restricts profile updates to the owner.
-- Grant only this additional column; do not broaden table-level UPDATE access.
GRANT UPDATE (avatar_config) ON public.profiles TO authenticated;
