ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);