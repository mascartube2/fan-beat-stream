-- Remove old cron, add new one calling the public endpoint via pg_net
DO $$
DECLARE
  _jid bigint;
BEGIN
  FOR _jid IN SELECT jobid FROM cron.job WHERE jobname IN ('auto-clip-rotation-20d','auto-clip-rotation-ai') LOOP
    PERFORM cron.unschedule(_jid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'auto-clip-rotation-ai',
  '15 0 * * *',
  $$ SELECT net.http_post(
    url := 'https://fan-beat-stream.lovable.app/api/public/auto-clip',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  ); $$
);

-- Reset rotation so next call publishes a fresh clip with AI poster
UPDATE public.auto_clip_rotation SET last_published_at = NULL, last_track_id = NULL WHERE id = 1;