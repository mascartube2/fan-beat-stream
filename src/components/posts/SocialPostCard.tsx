import { Heart, MessageCircle, Repeat2, Share2, Trash2, Pencil, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { CertifiedBadge } from "@/components/brand/CertifiedBadge";
import { toast } from "sonner";

export type FeedPost = {
  id: string;
  user_id: string;
  content: string | null;
  media_path: string | null;
  media_type: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  reposted_from: string | null;
  created_at: string;
  authorName: string;
  authorAvatar: string | null;
  mediaUrl: string | null;
  authorIsArtist?: boolean;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}j`;
}

export function SocialPostCard({ post, onChange }: { post: FeedPost; onChange?: () => void }) {
  const { user, isAdmin } = useAuth();
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [likes, setLikes] = useState(post.likes_count);
  const [reposts, setReposts] = useState(post.reposts_count);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content ?? "");
  const [content, setContent] = useState(post.content);

  const saveEdit = async () => {
    const newContent = draft.trim() || null;
    const { error } = await supabase.from("posts").update({ content: newContent }).eq("id", post.id);
    if (error) return toast.error(error.message);
    setContent(newContent);
    setEditing(false);
    toast.success("Modifié");
    onChange?.();
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: l }, { data: r }] = await Promise.all([
        supabase.from("post_likes").select("id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle(),
        supabase.from("post_reposts").select("id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle(),
      ]);
      setLiked(!!l);
      setReposted(!!r);
    })();
  }, [post.id, user?.id]);

  const toggleLike = async () => {
    if (!user) return toast.error("Connecte-toi pour liker");
    if (liked) {
      setLiked(false);
      setLikes((v) => v - 1);
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      setLiked(true);
      setLikes((v) => v + 1);
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    }
  };

  const toggleRepost = async () => {
    if (!user) return toast.error("Connecte-toi pour reposter");
    if (reposted) {
      setReposted(false);
      setReposts((v) => v - 1);
      await supabase.from("post_reposts").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      setReposted(true);
      setReposts((v) => v + 1);
      await supabase.from("post_reposts").insert({ post_id: post.id, user_id: user.id });
      // Create a repost entry in the feed
      await supabase.from("posts").insert({
        user_id: user.id,
        content: null,
        reposted_from: post.id,
      });
      onChange?.();
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.authorName, text: post.content ?? "", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Lien copié");
      }
    } catch {
      /* ignore */
    }
  };

  const remove = async () => {
    if (!confirm("Supprimer cette publication ?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Supprimée");
      onChange?.();
    }
  };

  return (
    <article className="bg-gradient-card mb-3 rounded-2xl border border-border/50 p-4 shadow-soft">
      <header className="mb-3 flex items-center gap-3">
        {post.authorAvatar ? (
          <img src={post.authorAvatar} alt={post.authorName} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-xs font-bold">
            {post.authorName.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-sm font-semibold">
            {post.authorName}
            {post.authorIsArtist && <CertifiedBadge />}
          </p>
          <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
        </div>
        {(user?.id === post.user_id || isAdmin) && (
          <div className="flex items-center gap-1">
            {user?.id === post.user_id && !editing && (
              <button onClick={() => setEditing(true)} className="rounded-full p-1.5 text-muted-foreground hover:bg-white/5" aria-label="Modifier">
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button onClick={remove} className="rounded-full p-1.5 text-muted-foreground hover:bg-white/5" aria-label="Supprimer">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </header>

      {editing ? (
        <div className="mb-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-background p-2 text-sm focus:border-primary focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => { setEditing(false); setDraft(content ?? ""); }} className="rounded-full border border-border px-3 py-1 text-xs">
              <X className="inline h-3 w-3" /> Annuler
            </button>
            <button onClick={saveEdit} className="rounded-full bg-gradient-primary px-3 py-1 text-xs font-bold">
              <Check className="inline h-3 w-3" /> Enregistrer
            </button>
          </div>
        </div>
      ) : (
        content && <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
      )}

      {post.mediaUrl && (
        <div className="mb-3 overflow-hidden rounded-xl">
          {post.media_type === "video" ? (
            <video src={post.mediaUrl} controls className="w-full" />
          ) : (
            <img src={post.mediaUrl} alt="" loading="lazy" className="w-full object-cover" />
          )}
        </div>
      )}

      <footer className="flex items-center gap-1 text-muted-foreground">
        <button onClick={toggleLike} className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs hover:bg-white/5">
          <Heart className={`h-4 w-4 ${liked ? "fill-primary-glow text-primary-glow" : ""}`} />
          <span>{likes}</span>
        </button>
        <Link to="/post/$postId" params={{ postId: post.id }} className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs hover:bg-white/5">
          <MessageCircle className="h-4 w-4" />
          <span>{post.comments_count}</span>
        </Link>
        <button onClick={toggleRepost} className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs hover:bg-white/5">
          <Repeat2 className={`h-4 w-4 ${reposted ? "text-green-400" : ""}`} />
          <span>{reposts}</span>
        </button>
        <button onClick={share} className="ml-auto rounded-full p-2 hover:bg-white/5" aria-label="Partager">
          <Share2 className="h-4 w-4" />
        </button>
      </footer>
    </article>
  );
}
