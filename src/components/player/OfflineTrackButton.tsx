import { useState } from "react";
import { Download } from "lucide-react";
import { useOfflineStatus } from "@/hooks/use-offline-media";
import { formatProgress } from "@/lib/offline-ui";
import { downloadTrackOffline, type DownloadableTrack } from "@/lib/tracks";
import { toast } from "sonner";

export function OfflineTrackButton({
  track,
  compact = false,
  className,
}: {
  track: DownloadableTrack;
  compact?: boolean;
  className?: string;
}) {
  const { downloaded, refresh } = useOfflineStatus("audio", track.id);
  const [progress, setProgress] = useState<{ receivedBytes: number; totalBytes: number | null } | null>(null);

  return (
    <div className={className ?? "flex flex-col items-end gap-1"}>
      <button
        onClick={async () => {
          if (downloaded) {
            toast.success("Déjà disponible hors ligne", { id: `dl-${track.id}` });
            return;
          }
          toast.loading("Téléchargement...", { id: `dl-${track.id}` });
          setProgress({ receivedBytes: 0, totalBytes: null });
          try {
            await downloadTrackOffline(track, (receivedBytes, totalBytes) => {
              setProgress({ receivedBytes, totalBytes });
              toast.loading(formatProgress(receivedBytes, totalBytes), { id: `dl-${track.id}` });
            });
            await refresh();
            toast.success(`${track.title} disponible hors ligne`, { id: `dl-${track.id}` });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Téléchargement impossible", { id: `dl-${track.id}` });
          } finally {
            setProgress(null);
          }
        }}
        className="rounded-full p-2 transition hover:bg-white/10"
        aria-label={`Télécharger ${track.title}`}
        title={downloaded ? "Disponible hors ligne" : "Télécharger hors ligne"}
      >
        <Download className={`h-4 w-4 ${downloaded ? "text-primary-glow" : "text-muted-foreground hover:text-primary-glow"}`} />
      </button>
      {!compact && progress && (
        <span className="max-w-24 text-right text-[10px] text-muted-foreground">
          {formatProgress(progress.receivedBytes, progress.totalBytes)}
        </span>
      )}
    </div>
  );
}