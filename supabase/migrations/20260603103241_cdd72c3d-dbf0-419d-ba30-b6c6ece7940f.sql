-- Rotation auto des clips audio publiés sur le feed tous les 20 jours
CREATE TABLE IF NOT EXISTS public.auto_clip_rotation (
  id integer PRIMARY KEY DEFAULT 1,
  last_track_id uuid,
  last_published_at timestamptz,
  CONSTRAINT singleton CHECK (id = 1)
);

GRANT SELECT ON public.auto_clip_rotation TO authenticated, anon;
GRANT ALL ON public.auto_clip_rotation TO service_role;
ALTER TABLE public.auto_clip_rotation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rotation readable by all" ON public.auto_clip_rotation FOR SELECT USING (true);

INSERT INTO public.auto_clip_rotation (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.publish_next_auto_clip()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.auto_clip_rotation;
  _track public.tracks;
  _content text;
  _author_name text;
BEGIN
  SELECT * INTO _row FROM public.auto_clip_rotation WHERE id = 1 FOR UPDATE;

  -- Respect 20 jours minimum entre publications
  IF _row.last_published_at IS NOT NULL
     AND _row.last_published_at > now() - INTERVAL '20 days' THEN
    RETURN;
  END IF;

  -- Choisit la prochaine piste : créée après la dernière publiée,
  -- sinon recommence depuis la plus ancienne (rotation cyclique)
  SELECT t.* INTO _track
  FROM public.tracks t
  WHERE _row.last_track_id IS NULL
     OR t.created_at > (SELECT created_at FROM public.tracks WHERE id = _row.last_track_id)
  ORDER BY t.created_at ASC
  LIMIT 1;

  IF _track.id IS NULL THEN
    SELECT * INTO _track FROM public.tracks ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF _track.id IS NULL THEN RETURN; END IF;

  SELECT display_name INTO _author_name FROM public.profiles WHERE user_id = _track.user_id;

  _content := '🎵 Nouveau clip à la une : « ' || _track.title || ' »'
              || COALESCE(' — ' || _author_name, '')
              || E'\n\nDécouvre le morceau sur Mascartube 🔥 #Clip #Mascartube';

  INSERT INTO public.posts (user_id, content)
  VALUES (_track.user_id, _content);

  UPDATE public.auto_clip_rotation
  SET last_track_id = _track.id, last_published_at = now()
  WHERE id = 1;
END;
$$;

-- Cron quotidien : la fonction n'agit que si 20 jours se sont écoulés
SELECT cron.unschedule('auto-clip-rotation-20d') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-clip-rotation-20d');

SELECT cron.schedule(
  'auto-clip-rotation-20d',
  '15 0 * * *',
  $$ SELECT public.publish_next_auto_clip(); $$
);