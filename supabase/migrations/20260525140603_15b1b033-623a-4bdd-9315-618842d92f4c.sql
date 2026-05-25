
-- 1) Drop publicly readable mvola_number from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS mvola_number;

-- 2) Update request_withdrawal to no longer write mvola_number to profiles
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount integer, _mvola text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _balance integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.has_role(_uid, 'artist') OR public.has_role(_uid, 'admin')) THEN
    RAISE EXCEPTION 'Artists only';
  END IF;
  IF _amount < 500 THEN RAISE EXCEPTION 'Minimum withdrawal is 500 MA.CA'; END IF;

  SELECT mascar_coins INTO _balance FROM public.profiles WHERE user_id = _uid FOR UPDATE;
  IF _balance < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.profiles SET mascar_coins = mascar_coins - _amount WHERE user_id = _uid;
  INSERT INTO public.withdrawals (user_id, maca_amount, amount_ar, mvola_number)
  VALUES (_uid, _amount, _amount * 10, _mvola);

  RETURN json_build_object('success', true);
END;
$function$;

-- 3) Restrict user_roles SELECT to owner (admins still covered by ALL policy)
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4) Add artist role check to storage UPDATE/DELETE policies
DROP POLICY IF EXISTS "Artists can update own audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update own covers" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete own audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete own covers" ON storage.objects;

CREATE POLICY "Artists can update own audio"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'audio-tracks'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND public.has_role(auth.uid(), 'artist'::app_role)
  );

CREATE POLICY "Artists can update own covers"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'track-covers'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND public.has_role(auth.uid(), 'artist'::app_role)
  );

CREATE POLICY "Artists can delete own audio"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'audio-tracks'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND public.has_role(auth.uid(), 'artist'::app_role)
  );

CREATE POLICY "Artists can delete own covers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'track-covers'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND public.has_role(auth.uid(), 'artist'::app_role)
  );
