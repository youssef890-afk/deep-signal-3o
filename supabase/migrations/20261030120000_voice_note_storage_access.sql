INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS voice_notes_insert_sender ON storage.objects;
CREATE POLICY voice_notes_insert_sender
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND NOT public.is_user_blocked((storage.foldername(name))[2])
);

DROP POLICY IF EXISTS voice_notes_read_participant ON storage.objects;
CREATE POLICY voice_notes_read_participant
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND EXISTS (
    SELECT 1
    FROM public.messages AS message
    WHERE message.message_type = 'audio'
      AND message.audio_url = storage.objects.name
      AND (
        message.sender_id = (SELECT auth.uid())
        OR message.receiver_id = (SELECT auth.uid())
      )
      AND NOT public.is_user_blocked(
        CASE
          WHEN message.sender_id = (SELECT auth.uid()) THEN message.receiver_id::text
          ELSE message.sender_id::text
        END
      )
  )
);
