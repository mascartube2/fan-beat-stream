-- Generic media view events for time-series charts
CREATE TABLE public.media_view_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_type text NOT NULL CHECK (media_type IN ('short','post')),
  media_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_view_events_lookup ON public.media_view_events (media_type, media_id, viewed_at DESC);

GRANT SELECT, INSERT ON public.media_view_events TO anon, authenticated;
GRANT ALL ON public.media_view_events TO service_role;

ALTER TABLE public.media_view_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read view events"
  ON public.media_view_events FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert view events"
  ON public.media_view_events FOR INSERT
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.media_view_events;

-- RPC: log a view and (for shorts) bump the counter
CREATE OR REPLACE FUNCTION public.log_media_view(_media_type text, _media_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _media_id IS NULL OR _media_type NOT IN ('short','post') THEN RETURN; END IF;

  INSERT INTO public.media_view_events (media_type, media_id) VALUES (_media_type, _media_id);

  IF _media_type = 'short' THEN
    UPDATE public.shorts SET views_count = views_count + 1 WHERE id = _media_id;
  END IF;
END;
$$;

-- Optional: views_count on posts for video posts (lightweight)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

-- Update RPC to also increment post counter
CREATE OR REPLACE FUNCTION public.log_media_view(_media_type text, _media_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _media_id IS NULL OR _media_type NOT IN ('short','post') THEN RETURN; END IF;

  INSERT INTO public.media_view_events (media_type, media_id) VALUES (_media_type, _media_id);

  IF _media_type = 'short' THEN
    UPDATE public.shorts SET views_count = views_count + 1 WHERE id = _media_id;
  ELSIF _media_type = 'post' THEN
    UPDATE public.posts SET views_count = views_count + 1 WHERE id = _media_id;
  END IF;
END;
$$;