-- 1. Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_certified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mascar_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mvola_number text;

-- 2. Deposits table
CREATE TABLE IF NOT EXISTS public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_ar integer NOT NULL CHECK (amount_ar > 0),
  maca_amount integer NOT NULL CHECK (maca_amount > 0),
  operator text NOT NULL DEFAULT 'Mvola',
  transaction_ref text NOT NULL,
  status text NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente','valide','refuse')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own deposits" ON public.deposits
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own deposits" ON public.deposits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update deposits" ON public.deposits
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_deposits_updated_at
  BEFORE UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  maca_amount integer NOT NULL CHECK (maca_amount >= 500),
  amount_ar integer NOT NULL,
  mvola_number text NOT NULL,
  status text NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente','paye','refuse')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdrawals" ON public.withdrawals
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update withdrawals" ON public.withdrawals
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Tips table
CREATE TABLE IF NOT EXISTS public.tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  short_id uuid REFERENCES public.shorts(id) ON DELETE SET NULL,
  maca_amount integer NOT NULL CHECK (maca_amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tips visible to participants" ON public.tips
  FOR SELECT USING (auth.uid() = from_user OR auth.uid() = to_user OR public.has_role(auth.uid(), 'admin'));

-- 5. RPC: transfer_maca (used for tips)
CREATE OR REPLACE FUNCTION public.transfer_maca(
  _to_user uuid,
  _amount integer,
  _short_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _from uuid := auth.uid();
  _balance integer;
BEGIN
  IF _from IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _from = _to_user THEN
    RAISE EXCEPTION 'Cannot transfer to yourself';
  END IF;
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT mascar_coins INTO _balance FROM public.profiles WHERE user_id = _from FOR UPDATE;
  IF _balance IS NULL OR _balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.profiles SET mascar_coins = mascar_coins - _amount WHERE user_id = _from;
  UPDATE public.profiles SET mascar_coins = mascar_coins + _amount WHERE user_id = _to_user;

  INSERT INTO public.tips (from_user, to_user, short_id, maca_amount)
  VALUES (_from, _to_user, _short_id, _amount);

  RETURN json_build_object('success', true, 'new_balance', _balance - _amount);
END;
$$;

-- 6. RPC: approve_deposit (admin credits user)
CREATE OR REPLACE FUNCTION public.approve_deposit(_deposit_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dep public.deposits;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT * INTO _dep FROM public.deposits WHERE id = _deposit_id FOR UPDATE;
  IF _dep IS NULL THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF _dep.status <> 'en_attente' THEN RAISE EXCEPTION 'Already processed'; END IF;

  UPDATE public.profiles SET mascar_coins = mascar_coins + _dep.maca_amount WHERE user_id = _dep.user_id;
  UPDATE public.deposits SET status = 'valide', reviewed_by = auth.uid(), reviewed_at = now() WHERE id = _deposit_id;
  RETURN json_build_object('success', true);
END;
$$;

-- 7. RPC: request_withdrawal (artist creates and debits)
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount integer, _mvola text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  UPDATE public.profiles SET mascar_coins = mascar_coins - _amount, mvola_number = _mvola WHERE user_id = _uid;
  INSERT INTO public.withdrawals (user_id, maca_amount, amount_ar, mvola_number)
  VALUES (_uid, _amount, _amount * 10, _mvola);

  RETURN json_build_object('success', true);
END;
$$;

-- 8. RPC: approve_withdrawal (admin marks as paid)
CREATE OR REPLACE FUNCTION public.approve_withdrawal(_withdrawal_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.withdrawals SET status = 'paye', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _withdrawal_id AND status = 'en_attente';
  RETURN json_build_object('success', true);
END;
$$;

-- 9. RPC: reject_withdrawal (admin refunds and rejects)
CREATE OR REPLACE FUNCTION public.reject_withdrawal(_withdrawal_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _w public.withdrawals;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO _w FROM public.withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF _w IS NULL OR _w.status <> 'en_attente' THEN RAISE EXCEPTION 'Invalid'; END IF;
  UPDATE public.profiles SET mascar_coins = mascar_coins + _w.maca_amount WHERE user_id = _w.user_id;
  UPDATE public.withdrawals SET status = 'refuse', reviewed_by = auth.uid(), reviewed_at = now() WHERE id = _withdrawal_id;
  RETURN json_build_object('success', true);
END;
$$;

-- 10. RPC: admin toggle certification
CREATE OR REPLACE FUNCTION public.set_certified(_user_id uuid, _value boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.profiles SET is_certified = _value WHERE user_id = _user_id;
  RETURN json_build_object('success', true);
END;
$$;