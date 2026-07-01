
-- ALBUMS
CREATE TABLE public.albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_path TEXT,
  price_ar INTEGER NOT NULL DEFAULT 5000,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.albums TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.albums TO authenticated;
GRANT ALL ON public.albums TO service_role;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "albums_public_read" ON public.albums FOR SELECT USING (is_published = true OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "albums_owner_insert" ON public.albums FOR INSERT WITH CHECK (auth.uid() = user_id AND (public.has_role(auth.uid(),'artist') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "albums_owner_update" ON public.albums FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "albums_owner_delete" ON public.albums FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER albums_updated_at BEFORE UPDATE ON public.albums FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend tracks with sale info + album link
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS album_id UUID REFERENCES public.albums(id) ON DELETE SET NULL;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS price_ar INTEGER NOT NULL DEFAULT 500;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN NOT NULL DEFAULT false;

-- PURCHASES
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('track','album')),
  track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
  album_id UUID REFERENCES public.albums(id) ON DELETE SET NULL,
  amount_ar INTEGER NOT NULL,
  artist_share_ar INTEGER NOT NULL,
  platform_share_ar INTEGER NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mvola','airtel','orange')),
  payment_reference TEXT,
  payer_number TEXT,
  status TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente','valide','refuse')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases_buyer_read" ON public.purchases FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = artist_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "purchases_buyer_insert" ON public.purchases FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "purchases_admin_update" ON public.purchases FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ARTIST EARNINGS
CREATE TABLE public.artist_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  amount_ar INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.artist_earnings TO authenticated;
GRANT ALL ON public.artist_earnings TO service_role;
ALTER TABLE public.artist_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "earnings_owner_read" ON public.artist_earnings FOR SELECT USING (auth.uid() = artist_id OR public.has_role(auth.uid(),'admin'));

-- request_purchase: user-side purchase creation with 85/15 split
CREATE OR REPLACE FUNCTION public.request_purchase(
  _item_type TEXT,
  _item_id UUID,
  _payment_method TEXT,
  _payer_number TEXT,
  _payment_reference TEXT
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _amount integer;
  _artist uuid;
  _artist_share integer;
  _platform_share integer;
  _track_id uuid := NULL;
  _album_id uuid := NULL;
  _purchase_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _item_type NOT IN ('track','album') THEN RAISE EXCEPTION 'Invalid item type'; END IF;
  IF _payment_method NOT IN ('mvola','airtel','orange') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;

  IF _item_type = 'track' THEN
    SELECT price_ar, user_id INTO _amount, _artist FROM public.tracks WHERE id = _item_id AND is_for_sale = true;
    IF _amount IS NULL THEN RAISE EXCEPTION 'Track not for sale'; END IF;
    _track_id := _item_id;
  ELSE
    SELECT price_ar, user_id INTO _amount, _artist FROM public.albums WHERE id = _item_id AND is_published = true;
    IF _amount IS NULL THEN RAISE EXCEPTION 'Album not available'; END IF;
    _album_id := _item_id;
  END IF;

  IF _artist = _uid THEN RAISE EXCEPTION 'Cannot buy your own item'; END IF;

  _artist_share := (_amount * 85) / 100;
  _platform_share := _amount - _artist_share;

  INSERT INTO public.purchases (buyer_id, artist_id, item_type, track_id, album_id, amount_ar, artist_share_ar, platform_share_ar, payment_method, payer_number, payment_reference)
  VALUES (_uid, _artist, _item_type, _track_id, _album_id, _amount, _artist_share, _platform_share, _payment_method, _payer_number, _payment_reference)
  RETURNING id INTO _purchase_id;

  RETURN json_build_object('success', true, 'purchase_id', _purchase_id, 'amount_ar', _amount, 'artist_share_ar', _artist_share, 'platform_share_ar', _platform_share);
END;
$$;

-- approve_purchase: admin validates & credits artist
CREATE OR REPLACE FUNCTION public.approve_purchase(_purchase_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _p public.purchases;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO _p FROM public.purchases WHERE id = _purchase_id FOR UPDATE;
  IF _p IS NULL OR _p.status <> 'en_attente' THEN RAISE EXCEPTION 'Invalid purchase'; END IF;

  UPDATE public.purchases SET status='valide', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=_purchase_id;
  INSERT INTO public.artist_earnings (artist_id, purchase_id, amount_ar) VALUES (_p.artist_id, _p.id, _p.artist_share_ar);
  UPDATE public.profiles SET mascar_coins = mascar_coins + (_p.artist_share_ar / 10) WHERE user_id = _p.artist_id;

  RETURN json_build_object('success', true);
END;
$$;

-- reject_purchase
CREATE OR REPLACE FUNCTION public.reject_purchase(_purchase_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.purchases SET status='refuse', reviewed_by=auth.uid(), reviewed_at=now()
    WHERE id=_purchase_id AND status='en_attente';
  RETURN json_build_object('success', true);
END;
$$;
