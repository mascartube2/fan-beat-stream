import { Pause, Play, SkipBack, SkipForward, Heart, Download } from "lucide-react";
import { usePlayer } from "./PlayerContext";
import { useState } from "react";
import { downloadTrackOffline } from "@/lib/tracks";
import { useOfflineStatus } from "@/hooks/use-offline-media";
import { formatProgress } from "@/lib/offline-ui";
import { toast } from "sonner";

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function MiniPlayer() {
  const { current, isPlaying, toggle, next, prev, progress, currentTime, duration, seek } =
    usePlayer();
  const [liked, setLiked] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ receivedBytes: number; totalBytes: number | null } | null>(null);
  const { downloaded, refresh } = useOfflineStatus("audio", current?.id ?? "");

  if (!current) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-3 pb-2">
      <div className="glass mx-auto max-w-md rounded-2xl p-2 shadow-elevated">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
            <img
              src={current.cover}
              alt={current.title}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
            {isPlaying && (
              <div className="absolute inset-0 flex items-end justify-center gap-0.5 bg-background/40 pb-1">
                <span className="eq-bar h-3 w-0.5 rounded-full bg-primary-glow" style={{ animationDelay: "0ms" }} />
                <span className="eq-bar h-3 w-0.5 rounded-full bg-primary-glow" style={{ animationDelay: "150ms" }} />
                <span className="eq-bar h-3 w-0.5 rounded-full bg-primary-glow" style={{ animationDelay: "300ms" }} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{current.title}</p>
            <p className="truncate text-xs text-muted-foreground">{current.artistName}</p>
          </div>
          <button
            onClick={async () => {
              if (downloaded) {
                toast.success("Déjà disponible hors ligne", { id: `dl-${current.id}` });
                return;
              }
              toast.loading("Téléchargement...", { id: `dl-${current.id}` });
              setDownloadProgress({ receivedBytes: 0, totalBytes: null });
              try {
                await downloadTrackOffline(current, (receivedBytes, totalBytes) => {
                  setDownloadProgress({ receivedBytes, totalBytes });
                  toast.loading(formatProgress(receivedBytes, totalBytes), { id: `dl-${current.id}` });
                });
                await refresh();
                toast.success(`${current.title} disponible hors ligne`, { id: `dl-${current.id}` });
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Téléchargement impossible", { id: `dl-${current.id}` });
              } finally {
                setDownloadProgress(null);
              }
            }}
            className="rounded-full p-2 transition hover:bg-white/10"
            aria-label={downloaded ? "Disponible hors ligne" : "Télécharger hors ligne"}
            title={downloaded ? "Disponible hors ligne" : "Télécharger hors ligne"}
          >
            <Download className={`h-4 w-4 ${downloaded ? "text-primary-glow" : ""}`} />
          </button>
          <button
            onClick={() => setLiked((l) => !l)}
            className="rounded-full p-2 transition hover:bg-white/10"
            aria-label="Like"
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-primary-glow text-primary-glow" : ""}`} />
          </button>
          <button onClick={prev} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Previous">
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary shadow-glow transition active:scale-95"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
          </button>
          <button onClick={next} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Next">
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center gap-2 px-1">
          <span className="w-8 text-[10px] tabular-nums text-muted-foreground">{fmt(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(progress * 1000)}
            onChange={(e) => seek(Number(e.target.value) / 1000)}
            className="h-1 flex-1 cursor-pointer accent-primary-glow"
            aria-label="Seek"
          />
          <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">{fmt(duration)}</span>
        </div>
        {downloadProgress && (
          <p className="mt-1 px-1 text-[10px] text-muted-foreground">{formatProgress(downloadProgress.receivedBytes, downloadProgress.totalBytes)}</p>
        )}
      </div>
    </div>
  );
}
