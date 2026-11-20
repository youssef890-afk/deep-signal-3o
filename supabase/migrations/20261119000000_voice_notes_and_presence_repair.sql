ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_duration_ms integer;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
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
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS voice_notes_insert_sender ON storage.objects;
CREATE POLICY voice_notes_insert_sender
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS voice_notes_read_participant ON storage.objects;
CREATE POLICY voice_notes_read_participant
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR (storage.foldername(name))[2] = (SELECT auth.uid())::text
  )
);

DROP POLICY IF EXISTS voice_notes_delete_sender ON storage.objects;
CREATE POLICY voice_notes_delete_sender
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS deep_signal_online_presence_select ON realtime.messages;
CREATE POLICY deep_signal_online_presence_select
ON realtime.messages FOR SELECT TO authenticated
USING (realtime.topic() = 'online-users');

DROP POLICY IF EXISTS deep_signal_online_presence_insert ON realtime.messages;
CREATE POLICY deep_signal_online_presence_insert
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (realtime.topic() = 'online-users');
