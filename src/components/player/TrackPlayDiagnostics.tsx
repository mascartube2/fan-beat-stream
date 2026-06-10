import { Activity, AlertTriangle, CheckCircle2, Clock3, Info } from "lucide-react";
import { usePlayer, type PlayDiagnosticEvent } from "./PlayerContext";

const reasonLabel: Record<PlayDiagnosticEvent["reason"], string> = {
  play_click: "clic play",
  resume: "reprise",
  duration_reached: "durée atteinte",
};

function fmtTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(
    new Date(value),
  );
}

function StatusIcon({ status }: { status: PlayDiagnosticEvent["status"] }) {
  if (status === "recorded") return <CheckCircle2 className="h-3 w-3 text-primary-glow" />;
  if (status === "failed") return <AlertTriangle className="h-3 w-3 text-destructive" />;
  if (status === "pending") return <Clock3 className="h-3 w-3 text-accent" />;
  return <Info className="h-3 w-3 text-muted-foreground" />;
}

export function TrackPlayDiagnostics() {
  const { current, diagnostics } = usePlayer();
  if (!current) return null;

  const visibleEvents = diagnostics.filter((event) => event.trackId === current.id).slice(0, 4);

  return (
    <div className="mt-2 rounded-xl border border-border/60 bg-surface/70 px-2.5 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
          <Activity className="h-3 w-3 text-primary-glow" />
          <span className="truncate">Diagnostic écoutes</span>
        </div>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{current.plays} total</span>
      </div>

      {visibleEvents.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">Aucun événement pour cette piste.</p>
      ) : (
        <div className="space-y-1">
          {visibleEvents.map((event) => (
            <div key={event.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5 text-[10px]">
              <StatusIcon status={event.status} />
              <span className="min-w-0 truncate text-muted-foreground">
                {reasonLabel[event.reason]} · {event.message ?? event.status}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {event.playsAfter !== undefined ? `#${event.playsAfter}` : fmtTime(event.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}