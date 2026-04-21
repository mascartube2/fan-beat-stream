import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Heart, Trash2, Plus, Upload, X, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { fetchShorts, type ShortWithAuthor } from "@/lib/shorts";
import { CertifiedBadge } from "@/components/brand/CertifiedBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/shorts")({
  component: ShortsPage,
  head: () => ({ meta: [{ title: "Réels — Mascartube" }] }),
});

function ShortsPage() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<ShortWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => fetchShorts(30).then((d) => { setItems(d); setLoading(false); });

  useEffect(() => {
    load();
    const ch = supabase
      .channel("shorts-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "shorts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const toggleLike = async (s: ShortWithAuthor) => {
    if (!user) { toast.error("Connecte-toi pour liker"); return; }
    setItems((prev) => prev.map((x) => x.id === s.id
      ? { ...x, liked: !x.liked, likes_count: x.likes_count + (x.liked ? -1 : 1) }
      : x));
    if (s.liked) {
      await supabase.from("short_likes").delete().eq("short_id", s.id).eq("user_id", user.id);
    } else {
      await supabase.from("short_likes").insert({ short_id: s.id, user_id: user.id });
    }
  };

  const handleDelete = async (s: ShortWithAuthor) => {
    if (!user) return;
    const canDelete = s.user_id === user.id || isAdmin;
    if (!canDelete) return;
    if (!confirm("Supprimer ce réel ?")) return;
    setBusyId(s.id);
    const prev = items;
    setItems((p) => p.filter((x) => x.id !== s.id));
    try {
      await supabase.storage.from("shorts").remove([s.video_path]);
      if (s.thumbnail_path) await supabase.storage.from("shorts").remove([s.thumbnail_path]);
      const { error } = await supabase.from("shorts").delete().eq("id", s.id);
      if (error) throw error;
      toast.success("Réel supprimé");
    } catch (err) {
      setItems(prev);
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="px-4 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Réels</h1>
        {user && (
          <button
            onClick={() => setComposerOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-2 text-xs font-bold shadow-glow"
          >
            <Plus className="h-4 w-4" /> Publier
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center">
          <Play className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucun réel pour le moment.</p>
          {user && <p className="mt-1 text-xs text-muted-foreground">Sois le premier à publier !</p>}
          {!user && (
            <Link to="/auth" className="mt-3 inline-block rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold">Se connecter</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((s) => (
            <div key={s.id} className="relative overflow-hidden rounded-xl border border-border/40 bg-surface">
              <video
                src={s.videoUrl}
                poster={s.thumbnailUrl ?? undefined}
                controls
                playsInline
                className="aspect-[9/16] w-full bg-black object-cover"
              />
              <div className="p-2">
                <div className="flex items-center gap-1.5">
                  {s.authorAvatar ? (
                    <img src={s.authorAvatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                  ) : (
                    <span className="h-5 w-5 rounded-full bg-muted" />
                  )}
                  <span className="truncate text-[11px] font-semibold">{s.authorName}</span>
                  {s.authorIsArtist && <CertifiedBadge />}
                </div>
                {s.caption && <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{s.caption}</p>}
                <div className="mt-1.5 flex items-center justify-between">
                  <button
                    onClick={() => toggleLike(s)}
                    className="flex items-center gap-1 text-[11px]"
                  >
                    <Heart className={`h-3.5 w-3.5 ${s.liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                    {s.likes_count}
                  </button>
                  {user && (s.user_id === user.id || isAdmin) && (
                    <button
                      onClick={() => handleDelete(s)}
                      disabled={busyId === s.id}
                      className="rounded-full p-1 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      aria-label="Supprimer"
                    >
                      {busyId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {composerOpen && user && (
        <ShortComposer onClose={() => setComposerOpen(false)} onCreated={load} />
      )}
    </div>
  );
}

function ShortComposer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [video, setVideo] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !video) return;
    if (video.size > 60 * 1024 * 1024) { toast.error("Vidéo trop lourde (max 60 Mo)"); return; }
    setBusy(true);
    try {
      const ext = video.name.split(".").pop() ?? "mp4";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("shorts").upload(path, video, { contentType: video.type });
      if (up.error) throw up.error;
      const ins = await supabase.from("shorts").insert({
        user_id: user.id,
        video_path: path,
        caption: caption.trim() || null,
      });
      if (ins.error) throw ins.error;
      toast.success("Réel publié !");
      onCreated();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-background p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Nouveau réel</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
          className="mb-3 w-full rounded-lg border border-border bg-input px-3 py-2 text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:font-bold file:text-primary-foreground"
          required
        />
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Légende (optionnel)"
          maxLength={280}
          rows={2}
          className="mb-3 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !video}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-2.5 text-xs font-bold shadow-glow disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? "Upload…" : "Publier"}
        </button>
      </form>
    </div>
  );
}
