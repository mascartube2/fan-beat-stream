-- Drop overly broad SELECT policies
DROP POLICY IF EXISTS "Audio publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Covers publicly readable" ON storage.objects;

-- Note: public buckets still allow direct access to individual files via their public URL
-- (e.g., /storage/v1/object/public/audio-tracks/xxx.mp3). The dropped policies were
-- only needed for LIST operations, which we don't want to allow anonymously.
-- We add a narrower SELECT policy: authenticated users can list their own folder only.

CREATE POLICY "Users can list own audio folder"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'audio-tracks'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can list own covers folder"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'track-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);