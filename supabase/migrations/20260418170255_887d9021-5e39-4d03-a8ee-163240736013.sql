-- Allow admins to insert tracks for any artist
CREATE POLICY "Admins can insert any track"
ON public.tracks
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete any track
CREATE POLICY "Admins can delete any track"
ON public.tracks
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to upload to audio-tracks bucket on behalf of anyone
CREATE POLICY "Admins can upload any audio"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'audio-tracks' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any audio"
ON storage.objects
FOR DELETE
USING (bucket_id = 'audio-tracks' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload any cover"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'track-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any cover"
ON storage.objects
FOR DELETE
USING (bucket_id = 'track-covers' AND public.has_role(auth.uid(), 'admin'));