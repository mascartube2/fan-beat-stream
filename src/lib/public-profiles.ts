import { supabase } from "@/integrations/supabase/client";

/**
 * Read-only access to the public_profiles view (safe display columns only:
 * name, avatar, bio, badge, slug, country). The profiles table itself is
 * restricted to signed-in users; this view powers public pages and SEO.
 */
export type PublicProfile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_certified: boolean | null;
  slug: string | null;
  bio: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
};

type PublicProfilesQuery = PromiseLike<{ data: PublicProfile[] | null }> & {
  select: (columns: string) => PublicProfilesQuery;
  in: (column: string, values: unknown[]) => PublicProfilesQuery;
  eq: (column: string, value: unknown) => PublicProfilesQuery;
  order: (column: string, options?: unknown) => PublicProfilesQuery;
  limit: (count: number) => PublicProfilesQuery;
  maybeSingle: () => PromiseLike<{ data: PublicProfile | null }>;
};

export const publicProfiles = (): PublicProfilesQuery =>
  (supabase.from as any)("public_profiles");
