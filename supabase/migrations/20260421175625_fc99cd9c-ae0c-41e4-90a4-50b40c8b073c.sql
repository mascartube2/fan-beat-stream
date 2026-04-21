-- Shorts table
CREATE TABLE public.shorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_path text NOT NULL,
  thumbnail_path text,
  caption text,
  views_count integer NOT NULL DEFAULT 0,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shorts viewable by everyone" ON public.shorts
  FOR SELECT USING (true);

CREATE POLICY "Users can create own shorts" ON public.shorts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shorts" ON public.shorts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users/admins can delete shorts" ON public.shorts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER shorts_set_updated_at
  BEFORE UPDATE ON public.shorts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Short likes
CREATE TABLE public.short_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id uuid NOT NULL REFERENCES public.shorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(short_id, user_id)
);

ALTER TABLE public.short_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Short likes viewable by everyone" ON public.short_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like shorts" ON public.short_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike shorts" ON public.short_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Counter trigger for short_likes
CREATE OR REPLACE FUNCTION public.shorts_likes_counter()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.shorts SET likes_count = likes_count + 1 WHERE id = NEW.short_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.shorts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.short_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER short_likes_counter
  AFTER INSERT OR DELETE ON public.short_likes
  FOR EACH ROW EXECUTE FUNCTION public.shorts_likes_counter();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('shorts', 'shorts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Shorts media publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'shorts');

CREATE POLICY "Users can upload own shorts media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'shorts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users/admins can delete shorts media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'shorts'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Allow admins to delete ANY story / post media too (moderation)
CREATE POLICY "Admins can delete any story media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'stories' AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete any post media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'posts' AND public.has_role(auth.uid(), 'admin')
  );