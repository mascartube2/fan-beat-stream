REVOKE EXECUTE ON FUNCTION public.publish_challenge_post(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_challenge() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.challenge_votes_counter() FROM anon, public;