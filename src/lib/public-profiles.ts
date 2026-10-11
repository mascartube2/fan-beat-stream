import { supabase } from "@/integrations/supabase/client";

/**
 * Read-only access to the public_profiles view (safe display columns only:
 * name, avatar, bio, badge, slug, country). The profiles table itself is
 * restricted to signed-in users; this view powers public pages and SEO.
 */
export const publicProfiles = () => (supabase.from as any)("public_profiles");
