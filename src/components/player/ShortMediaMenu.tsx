import { useState } from "react";
import { MoreVertical, WifiOff, Download, Trash2, Check, Loader2 } from "lucide-react";
import { useOfflineStatus } from "@/hooks/use-offline-media";
import { formatProgress } from "@/lib/offline-ui";
import { downloadShortOffline, downloadShortToDevice, type ShortWithAuthor } from "@/lib/shorts";
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

type ShortLike = Pick<ShortWithAuthor, "id" | "videoUrl" | "authorName" | "caption" | "thumbnailUrl">;

export function ShortMediaMenu({ short, onAfterOffline }: { short: ShortLike; onAfterOffline?: () => void }) {
  const { downloaded, refresh } = useOfflineStatus("video", short.id);
  const [busy, setBusy] = useState<"offline" | "device" | null>(null);

  const saveOffline = async () => {
    if (downloaded) {
      toast.success("Déjà hors ligne", { id: `dl-short-${short.id}` });
      return;
    }
    setBusy("offline");
    toast.loading("Sauvegarde hors ligne...", { id: `dl-short-${short.id}` });
    try {
      await downloadShortOffline(short, (received, total) => {
        toast.loading(formatProgress(received, total), { id: `dl-short-${short.id}` });
      });
      await refresh();
      onAfterOffline?.();
      toast.success("Réel disponible hors ligne", { id: `dl-short-${short.id}` });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sauvegarde impossible", { id: `dl-short-${short.id}` });
    } finally {
      setBusy(null);
    }
  };

  const deviceDownload = async () => {
    setBusy("device");
    toast.loading("Téléchargement sur l'appareil...", { id: `dlx-short-${short.id}` });
    try {
      await downloadShortToDevice(short);
      toast.success("Vidéo téléchargée", { id: `dlx-short-${short.id}` });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Téléchargement impossible", { id: `dlx-short-${short.id}` });
    } finally {
      setBusy(null);
    }
  };

  const removeOffline = async () => {
    try {
      await removeOfflineMedia("video", short.id);
      await refresh();
      toast.success("Retiré du mode hors ligne");
    } catch {
      toast.error("Suppression impossible");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
          aria-label="Options de téléchargement"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary-glow" />
          ) : downloaded ? (
            <span className="relative inline-flex">
              <MoreVertical className="h-4 w-4 text-primary-glow" />
              <Check className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary-glow text-background" />
            </span>
          ) : (
            <MoreVertical className="h-4 w-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="truncate">{short.caption || "Réel"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void saveOffline(); }} disabled={busy !== null}>
          <WifiOff className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span>{downloaded ? "Disponible hors ligne" : "Sauvegarder hors ligne"}</span>
            <span className="text-[10px] text-muted-foreground">Lecture sans connexion</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void deviceDownload(); }} disabled={busy !== null}>
          <Download className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span>Télécharger sur l'appareil</span>
            <span className="text-[10px] text-muted-foreground">Fichier MP4 dans Téléchargements</span>
          </div>
        </DropdownMenuItem>
        {downloaded && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => { e.preventDefault(); void removeOffline(); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Retirer du mode hors ligne
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
