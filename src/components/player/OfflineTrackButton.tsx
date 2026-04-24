import { useState } from "react";
import { MoreVertical, WifiOff, Download, Trash2, Check, Loader2 } from "lucide-react";
import { useOfflineStatus } from "@/hooks/use-offline-media";
import { formatProgress } from "@/lib/offline-ui";
import { downloadTrack, downloadTrackOffline, type DownloadableTrack } from "@/lib/tracks";
import { removeOfflineMedia } from "@/lib/offline-media";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [busy, setBusy] = useState<"offline" | "device" | null>(null);
  const [progress, setProgress] = useState<{ receivedBytes: number; totalBytes: number | null } | null>(null);

  const handleSaveOffline = async () => {
    if (downloaded) {
      toast.success("Déjà disponible hors ligne", { id: `dl-${track.id}` });
      return;
    }
    setBusy("offline");
    toast.loading("Sauvegarde hors ligne...", { id: `dl-${track.id}` });
    setProgress({ receivedBytes: 0, totalBytes: null });
    try {
      await downloadTrackOffline(track, (receivedBytes, totalBytes) => {
        setProgress({ receivedBytes, totalBytes });
        toast.loading(formatProgress(receivedBytes, totalBytes), { id: `dl-${track.id}` });
      });
      await refresh();
      toast.success(`${track.title} sauvegardé hors ligne`, { id: `dl-${track.id}` });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sauvegarde impossible", { id: `dl-${track.id}` });
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const handleDeviceDownload = async () => {
    setBusy("device");
    toast.loading("Téléchargement sur l'appareil...", { id: `dlx-${track.id}` });
    try {
      await downloadTrack(track);
      toast.success("Fichier téléchargé", { id: `dlx-${track.id}` });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Téléchargement impossible", { id: `dlx-${track.id}` });
    } finally {
      setBusy(null);
    }
  };

  const handleRemoveOffline = async () => {
    try {
      await removeOfflineMedia("audio", track.id);
      await refresh();
      toast.success("Retiré du mode hors ligne");
    } catch {
      toast.error("Suppression impossible");
    }
  };

  return (
    <div className={className ?? "flex flex-col items-end gap-1"}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="rounded-full p-2 transition hover:bg-white/10"
            aria-label={`Options pour ${track.title}`}
            title="Options de téléchargement"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary-glow" />
            ) : downloaded ? (
              <span className="relative inline-flex">
                <MoreVertical className="h-4 w-4 text-primary-glow" />
                <Check className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary-glow text-background" />
              </span>
            ) : (
              <MoreVertical className="h-4 w-4 text-muted-foreground hover:text-primary-glow" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="truncate">{track.title}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void handleSaveOffline(); }} disabled={busy !== null}>
            <WifiOff className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span>{downloaded ? "Disponible hors ligne" : "Sauvegarder hors ligne"}</span>
              <span className="text-[10px] text-muted-foreground">Lecture sans connexion</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void handleDeviceDownload(); }} disabled={busy !== null}>
            <Download className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span>Télécharger sur l'appareil</span>
              <span className="text-[10px] text-muted-foreground">Fichier MP3 dans Téléchargements</span>
            </div>
          </DropdownMenuItem>
          {downloaded && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); void handleRemoveOffline(); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Retirer du mode hors ligne
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {!compact && progress && (
        <span className="max-w-32 text-right text-[10px] text-muted-foreground">
          {formatProgress(progress.receivedBytes, progress.totalBytes)}
        </span>
      )}
    </div>
  );
}
