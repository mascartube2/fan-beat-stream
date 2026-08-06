CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  hashtag text,
  cover_path text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  prize_description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.challenges TO anon;
GRANT SELECT, INSERT, UPDATE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active challenges"
  ON public.challenges FOR SELECT
  USING (is_active = true AND starts_at <= now() AND ends_at >= now());

CREATE POLICY "Admins can manage challenges"
  ON public.challenges FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.challenge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id uuid REFERENCES public.tracks(id) ON DELETE SET NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  caption text,
  votes_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);

GRANT SELECT ON public.challenge_entries TO anon;
GRANT SELECT, INSERT, DELETE ON public.challenge_entries TO authenticated;
GRANT ALL ON public.challenge_entries TO service_role;

ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view challenge entries"
  ON public.challenge_entries FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own entry"
  ON public.challenge_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entry"
  ON public.challenge_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.challenge_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.challenge_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (entry_id, user_id)
);

GRANT SELECT ON public.challenge_votes TO authenticated;
GRANT ALL ON public.challenge_votes TO service_role;

ALTER TABLE public.challenge_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view votes"
  ON public.challenge_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can vote once per entry"
  ON public.challenge_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own vote"
  ON public.challenge_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.challenge_votes_counter()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.challenge_entries SET votes_count = votes_count + 1 WHERE id = NEW.entry_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.challenge_entries SET votes_count = GREATEST(votes_count - 1, 0) WHERE id = OLD.entry_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_challenge_votes_counter
AFTER INSERT OR DELETE ON public.challenge_votes
FOR EACH ROW EXECUTE FUNCTION public.challenge_votes_counter();

CREATE TRIGGER challenges_updated_at
BEFORE UPDATE ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.publish_challenge_post(_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _c public.challenges;
  _author uuid;
  _content text;
  _cover_path text;
BEGIN
  SELECT * INTO _c FROM public.challenges WHERE id = _challenge_id;
  IF _c IS NULL OR NOT _c.is_active THEN RETURN; END IF;

  SELECT user_id INTO _author FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  IF _author IS NULL THEN
    SELECT user_id INTO _author FROM public.profiles ORDER BY created_at ASC LIMIT 1;
  END IF;
  IF _author IS NULL THEN RETURN; END IF;

  _content := E'🏆✨ NOUVEAU DÉFI MASCARTUBE ✨🏆\n\n'
              || '🎯 ' || _c.title || E'\n'
              || COALESCE(_c.description || E'\n', '')
              || COALESCE('🎁 ' || _c.prize_description || E'\n\n', E'\n')
              || COALESCE('Hashtag : ' || _c.hashtag || E'\n', '')
              || E'👉 Participe maintenant sur /challenges/' || _challenge_id || E'\n\n'
              || '#DéfiMascartube ' || COALESCE(_c.hashtag, '');

  _cover_path := _c.cover_path;

  INSERT INTO public.posts (user_id, content, media_path, media_type)
  VALUES (_author, _content, _cover_path, CASE WHEN _cover_path IS NOT NULL THEN 'image' ELSE NULL END);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_challenge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.publish_challenge_post(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_challenge_created
AFTER INSERT ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.handle_new_challenge();