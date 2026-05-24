
-- RPCs publiques pour incrémenter les compteurs (visiteurs anonymes inclus)
CREATE OR REPLACE FUNCTION public.increment_short_view(_short_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.shorts SET views_count = views_count + 1 WHERE id = _short_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_track_play(_track_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.tracks SET plays = plays + 1 WHERE id = _track_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_short_view(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_track_play(uuid) TO anon, authenticated;

-- S'assurer que la table tracks et shorts diffusent les changements en temps réel
ALTER TABLE public.tracks REPLICA IDENTITY FULL;
ALTER TABLE public.shorts REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tracks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shorts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
