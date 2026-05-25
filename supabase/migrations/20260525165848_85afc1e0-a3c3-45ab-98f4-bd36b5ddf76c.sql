ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS genre TEXT;
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON public.tracks(genre);