
-- 1) Daily play counts per track
CREATE TABLE IF NOT EXISTS public.track_daily_plays (
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  day date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (track_id, day)
);

GRANT SELECT ON public.track_daily_plays TO anon, authenticated;
GRANT ALL ON public.track_daily_plays TO service_role;

ALTER TABLE public.track_daily_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Daily plays viewable by everyone"
  ON public.track_daily_plays FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_tdp_day ON public.track_daily_plays(day DESC);
CREATE INDEX IF NOT EXISTS idx_tdp_track ON public.track_daily_plays(track_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.track_daily_plays;
ALTER TABLE public.track_daily_plays REPLICA IDENTITY FULL;

-- 2) Update increment_track_play to also bump daily counter
CREATE OR REPLACE FUNCTION public.increment_track_play(_track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  UPDATE public.tracks SET plays = plays + 1 WHERE id = _track_id;
  INSERT INTO public.track_daily_plays (track_id, day, count, updated_at)
  VALUES (_track_id, _today, 1, now())
  ON CONFLICT (track_id, day)
  DO UPDATE SET count = public.track_daily_plays.count + 1, updated_at = now();
END;
$$;

-- 3) Monthly leaderboard publisher
CREATE OR REPLACE FUNCTION public.publish_monthly_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start date := date_trunc('month', (now() AT TIME ZONE 'UTC') - INTERVAL '1 month')::date;
  _end date := date_trunc('month', (now() AT TIME ZONE 'UTC'))::date;
  _month_label text := to_char(_start, 'TMMonth YYYY');
  _author uuid;
  _content text;
  _line text;
  _rank int := 0;
  _rec record;
  _medal text;
BEGIN
  SELECT user_id INTO _author FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  IF _author IS NULL THEN
    SELECT user_id INTO _author FROM public.profiles ORDER BY created_at ASC LIMIT 1;
  END IF;
  IF _author IS NULL THEN RETURN; END IF;

  _content := E'🏆✨ TOP 10 DU MOIS — ' || _month_label || E' ✨🏆\n\n';

  FOR _rec IN
    SELECT t.id, t.title, COALESCE(p.display_name, 'Artiste') AS artist, SUM(d.count)::int AS total
    FROM public.track_daily_plays d
    JOIN public.tracks t ON t.id = d.track_id
    LEFT JOIN public.profiles p ON p.user_id = t.user_id
    WHERE d.day >= _start AND d.day < _end
    GROUP BY t.id, t.title, p.display_name
    ORDER BY total DESC
    LIMIT 10
  LOOP
    _rank := _rank + 1;
    _medal := CASE _rank WHEN 1 THEN '🥇' WHEN 2 THEN '🥈' WHEN 3 THEN '🥉' ELSE '🎵' END;
    _line := _medal || ' #' || _rank || ' « ' || _rec.title || ' » — ' || _rec.artist || '  (' || _rec.total || ' écoutes)' || E'\n';
    _content := _content || _line;
  END LOOP;

  IF _rank = 0 THEN
    _content := _content || E'\nPas encore assez d''écoutes ce mois-ci. Reviens vite ! 🎧';
  ELSE
    _content := _content || E'\n🔥 Bravo aux artistes ! Continuez à faire vibrer Mascartube 💛\n#TopDuMois #Mascartube #Leaderboard';
  END IF;

  INSERT INTO public.posts (user_id, content) VALUES (_author, _content);
END;
$$;

-- 4) Schedule monthly: 1er du mois à 01:00 UTC
SELECT cron.unschedule('publish-monthly-leaderboard')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'publish-monthly-leaderboard');

SELECT cron.schedule(
  'publish-monthly-leaderboard',
  '0 1 1 * *',
  $$ SELECT public.publish_monthly_leaderboard(); $$
);
