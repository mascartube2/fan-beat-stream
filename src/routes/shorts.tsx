import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Heart, Trash2, Plus, Upload, X, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { fetchShorts, resolveShortPlaybackUrl, type ShortWithAuthor } from "@/lib/shorts";
import { CertifiedBadge } from "@/components/brand/CertifiedBadge";
import { ShortMediaMenu } from "@/components/player/ShortMediaMenu";
import { toast } from "sonner";

const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20 Mo
const MAX_VIDEO_SECONDS = 60;

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
  const [tipFor, setTipFor] = useState<ShortWithAuthor | null>(null);

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
    <div className="px-4 pt-4 pb-24">
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
        <div className="space-y-4">
          {items.map((s) => (
            <ShortCard
              key={s.id}
              short={s}
              currentUserId={user?.id ?? null}
              isAdmin={isAdmin}
              busy={busyId === s.id}
              onLike={() => toggleLike(s)}
              onTip={() => setTipFor(s)}
              onDelete={() => handleDelete(s)}
            />
          ))}
        </div>
      )}

      {composerOpen && user && (
        <ShortComposer onClose={() => setComposerOpen(false)} onCreated={load} />
      )}
      {tipFor && (
        <TipModal short={tipFor} onClose={() => setTipFor(null)} />
      )}
    </div>
  );
}

function ShortCard({
  short,
  currentUserId,
  isAdmin,
  busy,
  onLike,
  onTip,
  onDelete,
}: {
  short: ShortWithAuthor;
  currentUserId: string | null;
  isAdmin: boolean;
  busy: boolean;
  onLike: () => void;
  onTip: () => void;
  onDelete: () => void;
}) {
  const [videoSrc, setVideoSrc] = useState(short.videoUrl);

  useEffect(() => {
    let mounted = true;
    void resolveShortPlaybackUrl(short).then((url) => {
      if (mounted) setVideoSrc(url);
    });
    const onChanged = () => {
      void resolveShortPlaybackUrl(short).then((url) => {
        if (mounted) setVideoSrc(url);
      });
    };
    window.addEventListener("offline-media:changed", onChanged);
    return () => {
      mounted = false;
      window.removeEventListener("offline-media:changed", onChanged);
    };
  }, [short]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-surface">
      <video
        src={videoSrc}
        poster={short.thumbnailUrl ?? undefined}
        controls
        playsInline
        autoPlay
        muted
        loop
        className="aspect-[9/16] w-full bg-black object-cover"
      />
      <div className="p-3">
        <div className="flex items-center gap-1.5">
          {short.authorAvatar ? (
            <img src={short.authorAvatar} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <span className="h-6 w-6 rounded-full bg-muted" />
          )}
          <span className="truncate text-xs font-semibold">{short.authorName}</span>
          {short.authorIsArtist && <CertifiedBadge />}
          <div className="ml-auto">
            <ShortMediaMenu
              short={short}
              onAfterOffline={() => void resolveShortPlaybackUrl(short).then(setVideoSrc)}
            />
          </div>
        </div>
        {short.caption && <p className="mt-1.5 text-xs text-muted-foreground">{short.caption}</p>}
        <div className="mt-2 flex items-center gap-2">
          <button onClick={onLike} className="flex items-center gap-1 text-xs">
            <Heart className={`h-4 w-4 ${short.liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
            {short.likes_count}
          </button>
          {short.authorIsArtist && currentUserId && currentUserId !== short.user_id && (
            <button
              onClick={onTip}
              className="ml-auto flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/25"
            >
              <Coins className="h-3.5 w-3.5" /> Soutenir
            </button>
          )}
          {currentUserId && (short.user_id === currentUserId || isAdmin) && (
            <button
              onClick={onDelete}
              disabled={busy}
              className="ml-auto rounded-full p-1 text-destructive hover:bg-destructive/10 disabled:opacity-50"
              aria-label="Supprimer"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ShortComposer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [video, setVideo] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File | null) => {
    setVideo(null);
    setDuration(null);
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error(`Vidéo trop lourde (${(file.size / 1024 / 1024).toFixed(1)} Mo). Max 20 Mo.`);
      return;
    }
    // Probe duration
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;
    await new Promise<void>((resolve) => {
      v.onloadedmetadata = () => resolve();
      v.onerror = () => resolve();
    });
    URL.revokeObjectURL(url);
    const sec = isFinite(v.duration) ? v.duration : 0;
    if (sec > MAX_VIDEO_SECONDS) {
      toast.error(`Vidéo trop longue (${Math.round(sec)}s). Max 60s.`);
      return;
    }
    setVideo(file);
    setDuration(sec);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !video) return;
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
        <p className="mb-2 text-[11px] text-muted-foreground">Max 60 secondes • 20 Mo</p>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="mb-3 w-full rounded-lg border border-border bg-input px-3 py-2 text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:font-bold file:text-primary-foreground"
          required
        />
        {duration !== null && (
          <p className="mb-2 text-[11px] text-muted-foreground">Durée : {Math.round(duration)}s</p>
        )}
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

function TipModal({ short, onClose }: { short: ShortWithAuthor; onClose: () => void }) {
  const { balance, refresh } = useMaca();
  const [busy, setBusy] = useState(false);
  const presets = [10, 50, 100, 500];

  const send = async (amount: number) => {
    if (amount > balance) {
      toast.error(`Solde insuffisant (${balance} MA.CA). Recharge ton portefeuille.`);
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("transfer_maca", {
      _to_user: short.user_id,
      _amount: amount,
      _short_id: short.id,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`+${amount} MA.CA envoyés à ${short.authorName}`);
    refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-background p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Coins className="h-4 w-4 text-amber-400" /> Soutenir {short.authorName}
          </h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-3 text-[11px] text-muted-foreground">Ton solde : {balance} MA.CA</p>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((p) => (
            <button
              key={p}
              disabled={busy}
              onClick={() => send(p)}
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 py-3 text-sm font-bold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
            >
              {p} MA.CA
              <span className="block text-[10px] font-normal text-amber-300/70">{p * 10} Ar</span>
            </button>
          ))}
        </div>
        <Link
          to="/wallet"
          className="mt-3 block rounded-full border border-border py-2 text-center text-xs font-semibold"
        >
          Recharger mon portefeuille
        </Link>
      </div>
    </div>
  );
}
