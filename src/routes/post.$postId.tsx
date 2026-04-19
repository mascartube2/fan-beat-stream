import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { SocialPostCard, type FeedPost } from "@/components/posts/SocialPostCard";
import { toast } from "sonner";

export const Route = createFileRoute("/post/$postId")({
  component: PostDetail,
  head: () => ({ meta: [{ title: "Publication — Pulse" }] }),
});

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  authorName: string;
  authorAvatar: string | null;
};

function PostDetail() {
  const { postId } = useParams({ from: "/post/$postId" });
  const { user } = useAuth();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: p } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
    if (!p) {
      setLoading(false);
      return;
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("user_id,display_name,avatar_url")
      .eq("user_id", p.user_id)
      .maybeSingle();
    setPost({
      ...p,
      authorName: prof?.display_name ?? "Utilisateur",
      authorAvatar: prof?.avatar_url ?? null,
      mediaUrl: p.media_path ? supabase.storage.from("posts").getPublicUrl(p.media_path).data.publicUrl : null,
    });

    const { data: cs } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    const ids = Array.from(new Set((cs ?? []).map((c) => c.user_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("user_id,display_name,avatar_url").in("user_id", ids)
      : { data: [] as any[] };
    const map = new Map((profs ?? []).map((p) => [p.user_id, p]));
    setComments(
      (cs ?? []).map((c) => ({
        id: c.id,
        user_id: c.user_id,
        content: c.content,
        created_at: c.created_at,
        authorName: map.get(c.user_id)?.display_name ?? "Utilisateur",
        authorAvatar: map.get(c.user_id)?.avatar_url ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`post-${postId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [postId]);

  const send = async () => {
    if (!user || !draft.trim()) return;
    const c = draft.trim();
    setDraft("");
    const { error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, content: c });
    if (error) toast.error(error.message);
  };

  if (loading) return <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-muted-foreground" />;
  if (!post)
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-sm text-muted-foreground">Publication introuvable.</p>
        <Link to="/" className="mt-3 inline-block text-sm text-primary-glow">
          Retour
        </Link>
      </div>
    );

  return (
    <div className="px-4 pt-3 pb-32">
      <Link to="/" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>
      <SocialPostCard post={post} onChange={load} />

      <h2 className="mb-2 mt-4 text-xs font-semibold text-muted-foreground">
        Commentaires ({comments.length})
      </h2>
      <div className="space-y-2">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2.5 rounded-xl bg-surface/50 p-2.5">
            {c.authorAvatar ? (
              <img src={c.authorAvatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-[10px] font-bold">
                {c.authorName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">{c.authorName}</p>
              <p className="text-sm">{c.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && <p className="text-xs text-muted-foreground">Pas encore de commentaire.</p>}
      </div>

      {user && (
        <div className="fixed bottom-20 left-0 right-0 border-t border-border/40 bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-md gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Commenter…"
              className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={send}
              disabled={!draft.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
