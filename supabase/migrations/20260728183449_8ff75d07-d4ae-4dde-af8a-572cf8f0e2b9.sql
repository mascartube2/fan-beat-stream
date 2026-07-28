CREATE OR REPLACE FUNCTION public.publish_daily_visits_recap()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _yesterday date := _today - 1;
  _count integer;
  _week integer;
  _total integer;
  _best integer;
  _author uuid;
  _content text;
  _trend text;
BEGIN
  -- Anti-doublon : un seul récap par jour
  IF EXISTS (
    SELECT 1 FROM public.posts
    WHERE content LIKE '%RÉCAP VISITEURS%'
      AND created_at >= _today::timestamptz
  ) THEN
    RETURN;
  END IF;

  SELECT COALESCE(count, 0) INTO _count FROM public.daily_visits WHERE day = _yesterday;
  _count := COALESCE(_count, 0);

  SELECT COALESCE(SUM(count), 0) INTO _week FROM public.daily_visits WHERE day > _today - 7 AND day <= _yesterday;
  SELECT COALESCE(SUM(count), 0) INTO _total FROM public.daily_visits;
  SELECT COALESCE(MAX(count), 0) INTO _best FROM public.daily_visits;

  -- Rien du tout en base : on ne publie pas
  IF _total = 0 THEN RETURN; END IF;

  SELECT user_id INTO _author FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  IF _author IS NULL THEN
    SELECT user_id INTO _author FROM public.profiles ORDER BY created_at ASC LIMIT 1;
  END IF;
  IF _author IS NULL THEN RETURN; END IF;

  _trend := CASE
    WHEN _count = 0 THEN '😴 Journée calme hier… on compte sur toi aujourd''hui !'
    WHEN _count >= _best THEN '🚀 Nouveau record de fréquentation !'
    WHEN _count >= 10 THEN '🔥 Ça bouge sur Mascartube !'
    ELSE '💛 Merci à celles et ceux qui sont passés !'
  END;

  _content := E'📊✨ RÉCAP VISITEURS ✨📊\n\n'
    || '👥 Hier (' || to_char(_yesterday, 'DD/MM/YYYY') || ') : ' || _count || ' visiteur(s)' || E'\n'
    || '📅 7 derniers jours : ' || _week || E'\n'
    || '🏆 Record en une journée : ' || _best || E'\n'
    || '🌍 Total depuis le lancement : ' || _total || E'\n\n'
    || _trend || E'\n'
    || E'🎧 Écoute, publie, partage — invite tes amis à rejoindre Mascartube !\n\n'
    || '#Mascartube #Communauté #Musique';

  INSERT INTO public.posts (user_id, content) VALUES (_author, _content);
END;
$function$;