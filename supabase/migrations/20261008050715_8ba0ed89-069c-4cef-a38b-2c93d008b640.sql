DROP POLICY IF EXISTS "Presence viewable by everyone" ON public.user_presence;
REVOKE SELECT ON public.user_presence FROM anon;
CREATE POLICY "Signed-in users can view presence" ON public.user_presence FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

REVOKE SELECT (mascar_coins) ON public.profiles FROM anon;