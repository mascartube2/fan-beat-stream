import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { resolveTrackPlaybackUrl } from "@/lib/tracks";
import { supabase } from "@/integrations/supabase/client";

export type PlayableTrack = {
  id: string;
  title: string;
  artistName: string;
  cover: string;
  audioUrl: string;
  duration?: number;
  plays: number;
};

export type PlayCountReason = "play_click" | "resume" | "duration_reached";

export type PlayDiagnosticEvent = {
  id: string;
  trackId: string;
  trackTitle: string;
  reason: PlayCountReason;
  status: "pending" | "recorded" | "failed" | "info";
  message?: string;
  playsAfter?: number;
  dailyAfter?: number;
  createdAt: string;
};

type PlayerCtx = {
  current: PlayableTrack | null;
  queue: PlayableTrack[];
  isPlaying: boolean;
  progress: number; // 0..1
  currentTime: number;
  duration: number;
  diagnostics: PlayDiagnosticEvent[];
  playTrack: (track: PlayableTrack, queue?: PlayableTrack[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (ratio: number) => void;
};

const Ctx = createContext<PlayerCtx | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<PlayableTrack | null>(null);
  const [queue, setQueue] = useState<PlayableTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [diagnostics, setDiagnostics] = useState<PlayDiagnosticEvent[]>([]);
  const currentRef = useRef<PlayableTrack | null>(null);
  const durationInfoRef = useRef<string | null>(null);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const pushDiagnostic = (event: Omit<PlayDiagnosticEvent, "id" | "createdAt">) => {
    const id = `${event.trackId}-${event.reason}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const entry: PlayDiagnosticEvent = { ...event, id, createdAt: new Date().toISOString() };
    setDiagnostics((prev) => [entry, ...prev].slice(0, 30));
    return id;
  };

  const updateDiagnostic = (id: string, patch: Partial<PlayDiagnosticEvent>) => {
    setDiagnostics((prev) => prev.map((event) => (event.id === id ? { ...event, ...patch } : event)));
  };

  const recordListen = async (track: PlayableTrack, reason: PlayCountReason) => {
    const id = pushDiagnostic({
      trackId: track.id,
      trackTitle: track.title,
      reason,
      status: "pending",
      message: "Envoi au compteur…",
    });
    const { data, error } = await supabase.rpc("increment_track_play", { _track_id: track.id, _reason: reason });
    if (error) {
      updateDiagnostic(id, { status: "failed", message: error.message });
      return;
    }

    const result = data as { success?: boolean; message?: string; plays_after?: number; daily_after?: number } | null;
    if (result?.success === false) {
      updateDiagnostic(id, { status: "failed", message: result.message ?? "Écoute refusée" });
      return;
    }

    const playsAfter = typeof result?.plays_after === "number" ? result.plays_after : undefined;
    const dailyAfter = typeof result?.daily_after === "number" ? result.daily_after : undefined;
    updateDiagnostic(id, {
      status: "recorded",
      message: "Écoute enregistrée",
      playsAfter,
      dailyAfter,
    });

    if (typeof playsAfter === "number") {
      setCurrent((c) => (c?.id === track.id ? { ...c, plays: playsAfter } : c));
      setQueue((prev) => prev.map((t) => (t.id === track.id ? { ...t, plays: playsAfter } : t)));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("track-play-recorded", { detail: { trackId: track.id, playsAfter } }));
      }
    }
  };

  // Initialize audio element on mount (client only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = new Audio();
    a.preload = "metadata";
    audioRef.current = a;

    const onTime = () => {
      setCurrentTime(a.currentTime);
      const activeTrack = currentRef.current;
      if (!activeTrack || a.currentTime < 5) return;
      const marker = `${activeTrack.id}:${a.src}`;
      if (durationInfoRef.current === marker) return;
      durationInfoRef.current = marker;
      pushDiagnostic({
        trackId: activeTrack.id,
        trackTitle: activeTrack.title,
        reason: "duration_reached",
        status: "info",
        message: "Seuil de 5 secondes atteint — déjà compté au clic/reprise",
      });
    };
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => {
      setIsPlaying(false);
      // auto next
      setCurrent((c) => {
        if (!c) return c;
        const idx = queueRef.current.findIndex((t) => t.id === c.id);
        const nextTrack = queueRef.current[idx + 1];
        if (nextTrack) {
          loadAndPlay(nextTrack);
          return nextTrack;
        }
        return c;
      });
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const queueRef = useRef<PlayableTrack[]>([]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const loadAndPlay = async (track: PlayableTrack, reason: PlayCountReason = "play_click") => {
    const a = audioRef.current;
    if (!a) return;
    void recordListen(track, reason);
    const preferredUrl = await resolveTrackPlaybackUrl(track);
    if (a.src !== preferredUrl) {
      a.src = preferredUrl;
      durationInfoRef.current = null;
    }
    a.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  };

  const playTrack = (track: PlayableTrack, q?: PlayableTrack[]) => {
    if (q) setQueue(q);
    else if (queue.length === 0) setQueue([track]);
    setCurrent(track);
    setTimeout(() => loadAndPlay(track), 0);
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (a.paused) {
      void recordListen(current, "resume");
      a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      a.pause();
      setIsPlaying(false);
    }
  };

  const shift = (delta: number) => {
    if (!current || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === current.id);
    const nextIdx = (idx + delta + queue.length) % queue.length;
    const nt = queue[nextIdx];
    setCurrent(nt);
    loadAndPlay(nt);
  };

  const seek = (ratio: number) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    a.currentTime = Math.max(0, Math.min(duration, ratio * duration));
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <Ctx.Provider
      value={{
        current,
        queue,
        isPlaying,
        progress,
        currentTime,
        duration,
        diagnostics,
        playTrack,
        toggle,
        next: () => shift(1),
        prev: () => shift(-1),
        seek,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const usePlayer = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlayer must be used inside PlayerProvider");
  return v;
};
