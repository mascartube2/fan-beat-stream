import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Loader2, Music2, Play, Trash2, Video, HardDrive, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useOfflineLibrary, useOfflineMediaUrl } from "@/hooks/use-offline-media";
import { removeOfflineMedia, type OfflineMediaRecord } from "@/lib/offline-media";
import { formatBytes } from "@/lib/offline-ui";
import { toast } from "sonner";

export const Route = createFileRoute("/downloads")({
  component: DownloadsPage,
  head: () => ({ meta: [{ title: "Mes téléchargements — Mascartube" }] }),
});

function DownloadsPage() {
  const { items, grouped, loading, removeItem } = useOfflineLibrary();
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      navigator.storage.estimate().then((est) => {
        if (typeof est.usage === "number" && typeof est.quota === "number") {
          setQuota({ usage: est.usage, quota: est.quota });
        }
      }).catch(() => {});
    }
  }, [items.length]);

  const totalSize = useMemo(() => items.reduce((sum, it) => sum + (it.size || 0), 0), [items]);
  const quotaPercent = quota && quota.quota > 0 ? Math.min(100, (quota.usage / quota.quota) * 100) : null;

  const clearAll = async () => {
    if (items.length === 0) return;
    if (!confirm(`Supprimer ${items.length} fichier(s) hors ligne ?`)) return;
    try {
      for (const it of items) {
        await removeOfflineMedia(it.kind, it.id);
      }
      toast.success("Stockage hors ligne vidé");
    } catch {
      toast.error("Suppression partielle");
    }
  };

  return (
    <div className="px-4 pt-4 pb-24">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mes téléchargements</h1>
          <p className="text-xs text-muted-foreground">Lecture locale audio et vidéo, même hors ligne.</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60">
          <WifiOff className="h-4 w-4" />
        </span>
      </header>

      <section className="mb-5 rounded-2xl border border-border/50 bg-surface/40 p-4">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-primary-glow" />
          <h2 className="text-sm font-semibold">Stockage hors ligne</h2>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold">{items.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Fichiers</p>
          </div>
          <div>
            <p className="text-lg font-bold">{grouped.audio.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Audio</p>
          </div>
          <div>
            <p className="text-lg font-bold">{grouped.video.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Vidéos</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Espace utilisé par Mascartube</span>
          <span className="font-semibold">{formatBytes(totalSize)}</span>
        </div>
        {quotaPercent !== null && quota && (
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-primary"
                style={{ width: `${Math.max(2, quotaPercent)}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Navigateur : {formatBytes(quota.usage)} / {formatBytes(quota.quota)} disponibles
            </p>
          </div>
        )}
        {items.length > 0 && (
          <button
            onClick={clearAll}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Tout supprimer
          </button>
        )}
      </section>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : grouped.audio.length === 0 && grouped.video.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 px-4 py-10 text-center">
          <Download className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold">Aucun média hors ligne</p>
          <p className="mt-1 text-xs text-muted-foreground">Télécharge une musique ou un réel pour le retrouver ici.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Music2 className="h-4 w-4" /> Musiques
            </div>
            <div className="space-y-3">
              {grouped.audio.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune musique enregistrée.</p>
              ) : (
                grouped.audio.map((item) => <OfflineAudioCard key={item.key} item={item} onRemove={removeItem} />)
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Video className="h-4 w-4" /> Réels & vidéos
            </div>
            <div className="space-y-3">
              {grouped.video.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune vidéo enregistrée.</p>
              ) : (
                grouped.video.map((item) => <OfflineVideoCard key={item.key} item={item} onRemove={removeItem} />)
              )}
            </div>
          </section>
        </div>
      )}

      <Link
        to="/library"
        className="mt-6 block rounded-full border border-border px-4 py-2.5 text-center text-sm font-semibold"
      >
        Retour à la bibliothèque
      </Link>
    </div>
  );
}

function OfflineAudioCard({
  item,
  onRemove,
}: {
  item: OfflineMediaRecord;
  onRemove: (kind: "audio" | "video", id: string) => Promise<void>;
}) {
  const src = useOfflineMediaUrl("audio", item.id, "");

  return (
    <div className="rounded-2xl border border-border/50 bg-surface/40 p-3">
      <div className="flex items-center gap-3">
        {item.coverUrl ? (
          <img src={item.coverUrl} alt={item.title} className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted"><Music2 className="h-5 w-5" /></div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.title}</p>
          <p className="truncate text-xs text-muted-foreground">{item.artistName ?? "Audio hors ligne"}</p>
          <p className="text-[11px] text-muted-foreground">{formatBytes(item.size)}</p>
        </div>
        <button
          onClick={() => void onRemove("audio", item.id)}
          className="rounded-full p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          aria-label="Supprimer le téléchargement"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <audio src={src} controls className="mt-3 w-full" preload="metadata" />
    </div>
  );
}

function OfflineVideoCard({
  item,
  onRemove,
}: {
  item: OfflineMediaRecord;
  onRemove: (kind: "audio" | "video", id: string) => Promise<void>;
}) {
  const src = useOfflineMediaUrl("video", item.id, "");
  const [playing, setPlaying] = useState(false);
  const poster = useMemo(() => item.coverUrl ?? undefined, [item.coverUrl]);

  return (
    <div className="rounded-2xl border border-border/50 bg-surface/40 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.title}</p>
          <p className="truncate text-xs text-muted-foreground">{item.artistName ?? "Vidéo hors ligne"}</p>
          <p className="text-[11px] text-muted-foreground">{formatBytes(item.size)}</p>
        </div>
        <button
          onClick={() => void onRemove("video", item.id)}
          className="rounded-full p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          aria-label="Supprimer la vidéo téléchargée"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video
          src={src}
          poster={poster}
          controls
          playsInline
          loop
          className="aspect-[9/16] w-full object-cover"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        {!playing && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background/75 shadow-elevated">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}