CREATE OR REPLACE FUNCTION public.publish_next_auto_clip()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.auto_clip_rotation;
  _track public.tracks;
  _content text;
  _author_name text;
  _cover_url text;
BEGIN
  SELECT * INTO _row FROM public.auto_clip_rotation WHERE id = 1 FOR UPDATE;

  IF _row.last_published_at IS NOT NULL
     AND _row.last_published_at > now() - INTERVAL '20 days' THEN
    RETURN;
  END IF;

  SELECT t.* INTO _track
  FROM public.tracks t
  WHERE _row.last_track_id IS NULL
     OR t.created_at > (SELECT created_at FROM public.tracks WHERE id = _row.last_track_id)
  ORDER BY t.created_at ASC
  LIMIT 1;

  IF _track.id IS NULL THEN
    SELECT * INTO _track FROM public.tracks ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF _track.id IS NULL THEN RETURN; END IF;

  SELECT display_name INTO _author_name FROM public.profiles WHERE user_id = _track.user_id;

  _content := E'🎬✨ CLIP DE LA QUINZAINE ✨🎬\n\n'
              || '🎵 « ' || _track.title || ' »' || E'\n'
              || '🎤 ' || COALESCE(_author_name, 'Artiste Mascartube') || E'\n'
              || COALESCE('🎼 Genre : ' || _track.genre || E'\n', '')
              || E'\n🔥 Écoute le clip complet sur Mascartube\n'
              || E'👉 /track/' || _track.id || E'\n\n'
              || '#ClipDuMois #Mascartube #Musique #' || regexp_replace(COALESCE(_author_name, 'Artiste'), '\s+', '', 'g');

  INSERT INTO public.posts (user_id, content, media_path, media_type)
  VALUES (
    _track.user_id,
    _content,
    _track.cover_path,
    CASE WHEN _track.cover_path IS NOT NULL THEN 'image' ELSE NULL END
  );

  UPDATE public.auto_clip_rotation
  SET last_track_id = _track.id, last_published_at = now()
  WHERE id = 1;
END;
$$;