import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { resolveTrackPlaybackUrl } from "@/lib/tracks";

export type PlayableTrack = {
  id: string;
  title: string;
  artistName: string;
  cover: string;
  audioUrl: string;
  duration?: number;
};

type PlayerCtx = {
  current: PlayableTrack | null;
  queue: PlayableTrack[];
  isPlaying: boolean;
  progress: number; // 0..1
  currentTime: number;
  duration: number;
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

  // Initialize audio element on mount (client only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = new Audio();
    a.preload = "metadata";
    audioRef.current = a;

    const onTime = () => setCurrentTime(a.currentTime);
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

  const loadAndPlay = async (track: PlayableTrack) => {
    const a = audioRef.current;
    if (!a) return;
    const preferredUrl = await resolveTrackPlaybackUrl(track);
    if (a.src !== preferredUrl) {
      a.src = preferredUrl;
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
      a.play().then(() => setIsPlaying(true));
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
