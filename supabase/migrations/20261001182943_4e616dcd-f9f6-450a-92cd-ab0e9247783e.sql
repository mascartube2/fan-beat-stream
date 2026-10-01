DROP POLICY IF EXISTS "Users can view votes" ON public.challenge_votes;
CREATE POLICY "Users can view their own votes" ON public.challenge_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Track play events are viewable by everyone" ON public.track_play_events;
REVOKE SELECT ON public.track_play_events FROM anon;
CREATE POLICY "Admins can view track play events" ON public.track_play_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can insert view events" ON public.media_view_events;
REVOKE INSERT ON public.media_view_events FROM anon, authenticated;