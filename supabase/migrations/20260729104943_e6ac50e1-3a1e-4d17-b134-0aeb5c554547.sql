ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS preview_path text,
  ADD COLUMN IF NOT EXISTS preview_duration_seconds integer;

ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS preview_path text,
  ADD COLUMN IF NOT EXISTS preview_duration_seconds integer;

CREATE OR REPLACE FUNCTION public.validate_preview_duration()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.preview_duration_seconds IS NOT NULL AND NEW.preview_duration_seconds > 80 THEN
    RAISE EXCEPTION 'Extrait trop long : 1 min 20 max';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_album_preview ON public.albums;
CREATE TRIGGER validate_album_preview
BEFORE INSERT OR UPDATE ON public.albums
FOR EACH ROW EXECUTE FUNCTION public.validate_preview_duration();

DROP TRIGGER IF EXISTS validate_track_preview ON public.tracks;
CREATE TRIGGER validate_track_preview
BEFORE INSERT OR UPDATE ON public.tracks
FOR EACH ROW EXECUTE FUNCTION public.validate_preview_duration();

GRANT SELECT ON public.albums TO anon;

DROP POLICY IF EXISTS "Published albums are publicly viewable" ON public.albums;
CREATE POLICY "Published albums are publicly viewable"
ON public.albums FOR SELECT
TO anon, authenticated
USING (is_published = true);