-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Avatars: public read
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Avatars: users upload to their own folder
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Avatars: users update their own
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Avatars: users delete their own
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Stories bucket: ensure write/delete policies exist
CREATE POLICY "Story media publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'stories');

CREATE POLICY "Users can upload their own story media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stories'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own story media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'stories'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
