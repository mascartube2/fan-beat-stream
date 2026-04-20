
CREATE TABLE public.user_presence (
  user_id UUID NOT NULL PRIMARY KEY,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Presence viewable by everyone"
ON public.user_presence FOR SELECT USING (true);

CREATE POLICY "Users can upsert own presence"
ON public.user_presence FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presence"
ON public.user_presence FOR UPDATE
USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
