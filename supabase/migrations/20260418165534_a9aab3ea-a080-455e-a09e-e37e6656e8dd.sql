-- ============ ENUM ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'artist', 'user');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Anyone can view roles"
ON public.user_roles FOR SELECT USING (true);

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ TIMESTAMP TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUTO-CREATE PROFILE + ROLE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ ARTIST REQUESTS ============
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.artist_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bio TEXT NOT NULL,
  message TEXT,
  status public.request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artist_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
ON public.artist_requests FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own requests"
ON public.artist_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update requests"
ON public.artist_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_artist_requests_updated_at
BEFORE UPDATE ON public.artist_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- When an artist request is approved, grant artist role
CREATE OR REPLACE FUNCTION public.handle_artist_request_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'artist')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_artist_request_approved
AFTER UPDATE ON public.artist_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_artist_request_approval();

-- ============ TRACKS ============
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  audio_path TEXT NOT NULL,
  cover_path TEXT,
  duration_seconds INTEGER,
  plays INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tracks are viewable by everyone"
ON public.tracks FOR SELECT USING (true);

CREATE POLICY "Artists can insert own tracks"
ON public.tracks FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'artist'));

CREATE POLICY "Artists can update own tracks"
ON public.tracks FOR UPDATE
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'artist'));

CREATE POLICY "Artists can delete own tracks"
ON public.tracks FOR DELETE
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'artist'));

CREATE TRIGGER update_tracks_updated_at
BEFORE UPDATE ON public.tracks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tracks_user_id ON public.tracks(user_id);
CREATE INDEX idx_tracks_created_at ON public.tracks(created_at DESC);

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-tracks', 'audio-tracks', true), ('track-covers', 'track-covers', true);

-- Audio tracks: public read, artists can upload to own folder
CREATE POLICY "Audio publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-tracks');

CREATE POLICY "Artists can upload audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audio-tracks'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.has_role(auth.uid(), 'artist')
);

CREATE POLICY "Artists can update own audio"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'audio-tracks'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Artists can delete own audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'audio-tracks'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Covers: public read, artists can upload to own folder
CREATE POLICY "Covers publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'track-covers');

CREATE POLICY "Artists can upload covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'track-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.has_role(auth.uid(), 'artist')
);

CREATE POLICY "Artists can update own covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'track-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Artists can delete own covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'track-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);