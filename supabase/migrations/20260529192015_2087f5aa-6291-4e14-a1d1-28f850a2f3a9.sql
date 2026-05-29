
-- Daily visits counter
CREATE TABLE IF NOT EXISTS public.daily_visits (
  day date PRIMARY KEY DEFAULT (now() AT TIME ZONE 'UTC')::date,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.daily_visits TO anon, authenticated;
GRANT ALL ON public.daily_visits TO service_role;

ALTER TABLE public.daily_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Daily visits readable by all"
ON public.daily_visits FOR SELECT
USING (true);

-- Increment today's visit (callable by anon)
CREATE OR REPLACE FUNCTION public.increment_daily_visit()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _count integer;
BEGIN
  INSERT INTO public.daily_visits (day, count)
  VALUES (_today, 1)
  ON CONFLICT (day) DO UPDATE SET count = public.daily_visits.count + 1
  RETURNING count INTO _count;
  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_daily_visit() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_today_visits()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT count FROM public.daily_visits WHERE day = (now() AT TIME ZONE 'UTC')::date), 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_today_visits() TO anon, authenticated;

-- System user for auto-published posts: use first admin if exists, else any profile.
-- Publish yesterday's recap to the feed
CREATE OR REPLACE FUNCTION public.publish_daily_visits_recap()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _yesterday date := ((now() AT TIME ZONE 'UTC')::date - 1);
  _count integer;
  _author uuid;
  _content text;
BEGIN
  SELECT count INTO _count FROM public.daily_visits WHERE day = _yesterday;
  IF _count IS NULL OR _count = 0 THEN RETURN; END IF;

  SELECT user_id INTO _author FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  IF _author IS NULL THEN
    SELECT user_id INTO _author FROM public.profiles ORDER BY created_at ASC LIMIT 1;
  END IF;
  IF _author IS NULL THEN RETURN; END IF;

  _content := '🎉 Mascartube a accueilli ' || _count || ' visiteurs hier ! Merci à toute la communauté 💛 Invite tes amis à nous rejoindre !';

  INSERT INTO public.posts (user_id, content) VALUES (_author, _content);
END;
$$;

-- Schedule via pg_cron at 00:05 UTC daily
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('publish-daily-visits-recap');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'publish-daily-visits-recap',
  '5 0 * * *',
  $$SELECT public.publish_daily_visits_recap();$$
);
