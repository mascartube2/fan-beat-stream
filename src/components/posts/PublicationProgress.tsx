import { Check, Loader2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/offline-ui";
import type { PublicationStatus } from "@/lib/media-upload";

export function PublicationProgress({ status }: { status: PublicationStatus | null }) {
  if (!status) return null;
  const percent = status.totalBytes > 0
    ? Math.min(100, Math.round(status.receivedBytes / status.totalBytes * 100)) : 0;
  const fileDone = status.stage === "publishing" || status.stage === "success";
  const failed = status.stage === "error";
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="my-3 min-w-0 space-y-2 text-xs">
      {status.fileName && (
        <>
          <p className="truncate text-muted-foreground" title={status.fileName}>{status.fileName}</p>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              {fileDone ? <Check className="h-3.5 w-3.5 text-primary" /> : failed ? <AlertCircle className="h-3.5 w-3.5 text-destructive" /> : <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />}
              {fileDone ? "Fichier envoyé" : status.stage === "preparing" ? "Préparation du fichier…" : "Envoi du fichier"}
            </span>
            <span className="shrink-0 tabular-nums">{percent} %</span>
          </div>
          <Progress value={percent} aria-label="Envoi du fichier" />
          <p className="text-muted-foreground tabular-nums">{formatBytes(status.receivedBytes)} / {formatBytes(status.totalBytes)}</p>
        </>
      )}
      <p className={`flex items-center gap-1.5 ${failed ? "text-destructive" : "text-muted-foreground"}`}>
        {status.stage === "publishing" && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none" />}
        {status.stage === "success" && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
        {failed ? status.error : status.stage === "success" ? "Publication en ligne" : status.stage === "publishing" ? "Publication en cours…" : "Publication en attente"}
      </p>
    </div>
  );
}