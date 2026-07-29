import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { formatSeconds, PREVIEW_MAX_SECONDS } from "@/lib/albums";

/** Small audio preview player, hard-capped at 1 min 20. */
export function PreviewPlayer({
  url,
  duration,
  label = "Extrait",
}: {
  url: string;
  duration?: number | null;
  label?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const total = Math.min(duration || PREVIEW_MAX_SECONDS, PREVIEW_MAX_SECONDS);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-full border border-border/50 bg-surface px-2 py-1.5">
      <button
        onClick={toggle}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow"
        aria-label={playing ? "Pause extrait" : "Écouter l'extrait"}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-muted-foreground">{label}</p>
        <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-black/30">
          <div
            className="h-full rounded-full bg-gradient-primary transition-all"
            style={{ width: `${total ? Math.min(100, (time / total) * 100) : 0}%` }}
          />
        </div>
      </div>
      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
        {formatSeconds(time)} / {formatSeconds(total)}
      </span>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.currentTime >= PREVIEW_MAX_SECONDS) {
            a.pause();
            a.currentTime = 0;
            setPlaying(false);
            setTime(0);
            return;
          }
          setTime(a.currentTime);
        }}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
        onPause={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
