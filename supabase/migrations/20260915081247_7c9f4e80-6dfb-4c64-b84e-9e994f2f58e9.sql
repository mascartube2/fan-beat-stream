CREATE OR REPLACE FUNCTION public.unaccent_fallback(v text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT translate(coalesce(v,''),
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY')
$$;

CREATE OR REPLACE FUNCTION public.slugify(v text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(both '-' from regexp_replace(lower(public.unaccent_fallback(coalesce(v,''))), '[^a-z0-9]+', '-', 'g'))
$$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.set_profile_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base text; candidate text; n int := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' AND TG_OP = 'UPDATE'
     AND OLD.display_name IS NOT DISTINCT FROM NEW.display_name THEN
    RETURN NEW;
  END IF;
  base := public.slugify(NEW.display_name);
  IF base IS NULL OR base = '' THEN base := 'artiste'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles p WHERE p.slug = candidate AND p.user_id <> NEW.user_id) LOOP
    n := n + 1; candidate := base || '-' || n;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.set_track_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base text; candidate text; n int := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' AND TG_OP = 'UPDATE'
     AND OLD.title IS NOT DISTINCT FROM NEW.title THEN
    RETURN NEW;
  END IF;
  base := public.slugify(NEW.title);
  IF base IS NULL OR base = '' THEN base := 'morceau'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.tracks t WHERE t.slug = candidate AND t.id <> NEW.id) LOOP
    n := n + 1; candidate := base || '-' || n;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_set_slug ON public.profiles;
CREATE TRIGGER profiles_set_slug BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profile_slug();

DROP TRIGGER IF EXISTS tracks_set_slug ON public.tracks;
CREATE TRIGGER tracks_set_slug BEFORE INSERT OR UPDATE ON public.tracks
FOR EACH ROW EXECUTE FUNCTION public.set_track_slug();

DO $$
DECLARE r record; base text; candidate text; n int;
BEGIN
  FOR r IN SELECT user_id, display_name FROM public.profiles WHERE slug IS NULL OR slug = '' LOOP
    base := public.slugify(r.display_name);
    IF base = '' OR base IS NULL THEN base := 'artiste'; END IF;
    candidate := base; n := 1;
    WHILE EXISTS (SELECT 1 FROM public.profiles p WHERE p.slug = candidate) LOOP
      n := n + 1; candidate := base || '-' || n;
    END LOOP;
    UPDATE public.profiles SET slug = candidate WHERE user_id = r.user_id;
  END LOOP;
  FOR r IN SELECT id, title FROM public.tracks WHERE slug IS NULL OR slug = '' LOOP
    base := public.slugify(r.title);
    IF base = '' OR base IS NULL THEN base := 'morceau'; END IF;
    candidate := base; n := 1;
    WHILE EXISTS (SELECT 1 FROM public.tracks t WHERE t.slug = candidate) LOOP
      n := n + 1; candidate := base || '-' || n;
    END LOOP;
    UPDATE public.tracks SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_key ON public.profiles (slug);
CREATE UNIQUE INDEX IF NOT EXISTS tracks_slug_key ON public.tracks (slug);