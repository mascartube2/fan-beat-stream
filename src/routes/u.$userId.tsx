import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserPosts } from "@/lib/posts";
import { SocialPostCard, type FeedPost } from "@/components/posts/SocialPostCard";
import { CertifiedBadge } from "@/components/brand/CertifiedBadge";
import { publicUrl } from "@/lib/tracks";

export const Route = createFileRoute("/u/$userId")({
  component: UserWallPage,
  head: () => ({ meta: [{ title: "Mur d'artiste — Mascartube" }] }),
  errorComponent: ({ error }) => (
    <div className="p-6 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="p-6 text-center text-sm text-muted-foreground">Profil introuvable.</div>
  ),
});

function UserWallPage() {
  const { userId } = Route.useParams();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; bio: string | null; is_certified: boolean } | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: prof }, all] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url, bio, is_certified").eq("user_id", userId).maybeSingle(),
      fetchUserPosts(userId, 200),
    ]);
    setProfile(prof ?? null);
    setPosts(all);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [userId]);

  const avatarRaw = profile?.avatar_url ?? null;
  const avatarUrl = avatarRaw
    ? avatarRaw.startsWith("http") ? avatarRaw : publicUrl("avatars", avatarRaw)
    : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="bg-gradient-hero relative h-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow" />
        <Link to="/" className="absolute left-4 top-4 rounded-full glass p-2.5">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="relative px-4">
        <div className="-mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-gradient-primary text-2xl font-bold shadow-elevated">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (profile?.display_name ?? "?").charAt(0).toUpperCase()
          )}
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <h1 className="text-xl font-bold">{profile?.display_name ?? "Artiste"}</h1>
          {profile?.is_certified && <CertifiedBadge className="h-5 w-5" />}
        </div>
        {profile?.bio && <p className="mt-2 text-sm text-muted-foreground">{profile.bio}</p>}

        <h2 className="mt-6 text-sm font-semibold text-muted-foreground">
          Mur · {posts.length} publication{posts.length > 1 ? "s" : ""}
        </h2>

        <div className="mt-3 space-y-4">
          {posts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              Aucune publication.
            </p>
          ) : (
            posts.map((p) => <SocialPostCard key={p.id} post={p} onChange={load} />)
          )}
        </div>
      </div>
    </div>
  );
}
