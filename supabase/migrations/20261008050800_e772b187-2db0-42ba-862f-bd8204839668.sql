ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS downloads_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_album_download(_album_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.albums SET downloads_count = downloads_count + 1
  WHERE id = _album_id AND is_published = true
  RETURNING downloads_count;
$$;

GRANT EXECUTE ON FUNCTION public.increment_album_download(uuid) TO anon, authenticated;