CREATE TABLE public.track_play_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'recorded',
  message text,
  plays_after integer,
  daily_after integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.track_play_events TO anon;
GRANT SELECT ON public.track_play_events TO authenticated;
GRANT ALL ON public.track_play_events TO service_role;

ALTER TABLE public.track_play_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Track play events are viewable by everyone"
ON public.track_play_events
FOR SELECT
USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.track_play_events;

CREATE OR REPLACE FUNCTION public.increment_track_play(_track_id uuid, _reason text DEFAULT 'play_click')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _plays integer;
  _daily integer;
BEGIN
  IF _track_id IS NULL THEN
    INSERT INTO public.track_play_events (track_id, reason, status, message)
    VALUES (_track_id, COALESCE(_reason, 'unknown'), 'failed', 'track_id manquant');
    RETURN json_build_object('success', false, 'message', 'track_id manquant');
  END IF;

  UPDATE public.tracks
  SET plays = COALESCE(plays, 0) + 1
  WHERE id = _track_id
  RETURNING plays INTO _plays;

  IF _plays IS NULL THEN
    INSERT INTO public.track_play_events (track_id, reason, status, message)
    VALUES (_track_id, COALESCE(_reason, 'unknown'), 'failed', 'piste introuvable');
    RETURN json_build_object('success', false, 'message', 'piste introuvable');
  END IF;

  INSERT INTO public.track_daily_plays (track_id, day, count, updated_at)
  VALUES (_track_id, _today, 1, now())
  ON CONFLICT (track_id, day)
  DO UPDATE SET count = public.track_daily_plays.count + 1, updated_at = now()
  RETURNING count INTO _daily;

  INSERT INTO public.track_play_events (track_id, reason, status, plays_after, daily_after)
  VALUES (_track_id, COALESCE(_reason, 'unknown'), 'recorded', _plays, _daily);

  RETURN json_build_object(
    'success', true,
    'track_id', _track_id,
    'reason', COALESCE(_reason, 'unknown'),
    'plays_after', _plays,
    'daily_after', _daily
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.track_play_events (track_id, reason, status, message)
  VALUES (_track_id, COALESCE(_reason, 'unknown'), 'failed', SQLERRM);
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_track_play(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_track_play(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_track_play(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_track_play(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_track_play(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_track_play(uuid) TO service_role;