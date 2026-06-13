import { supabase } from "@/integrations/supabase/client";
import type { FeedPost } from "@/components/posts/SocialPostCard";

export async function fetchFeedPosts(limit = 50): Promise<FeedPost[]> {
  const { data: rows } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!rows?.length) return [];

  // Les publications texte (sans média) disparaissent du feed après 20 jours,
  // mais restent visibles sur le mur de leur auteur (route /u/$userId).
  const cutoff = Date.now() - 20 * 24 * 60 * 60 * 1000;
  const filteredRows = rows.filter((r) => {
    const isTextOnly = !r.media_path;
    if (!isTextOnly) return true;
    return new Date(r.created_at).getTime() >= cutoff;
  });
  if (!filteredRows.length) return [];

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profs } = await supabase
    .from("profiles")
    .select("user_id,display_name,avatar_url,is_certified")
    .in("user_id", userIds);
  const profMap = new Map((profs ?? []).map((p) => [p.user_id, p]));

  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    content: r.content,
    media_path: r.media_path,
    media_type: r.media_type,
    likes_count: r.likes_count,
    comments_count: r.comments_count,
    reposts_count: r.reposts_count,
    reposted_from: r.reposted_from,
    created_at: r.created_at,
    authorName: profMap.get(r.user_id)?.display_name ?? "Utilisateur",
    authorAvatar: (() => {
      const a = profMap.get(r.user_id)?.avatar_url;
      if (!a) return null;
      if (a.startsWith("http")) return a;
      return supabase.storage.from("track-covers").getPublicUrl(a).data.publicUrl;
    })(),
    mediaUrl: r.media_path ? supabase.storage.from("posts").getPublicUrl(r.media_path).data.publicUrl : null,
    authorIsArtist: !!profMap.get(r.user_id)?.is_certified,
  }));
}
