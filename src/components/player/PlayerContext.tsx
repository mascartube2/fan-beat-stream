import { createContext, useContext, useState, type ReactNode } from "react";
import { tracks, type Track } from "@/lib/mock-data";

type PlayerCtx = {
  current: Track | null;
  isPlaying: boolean;
  play: (track: Track) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
};

const Ctx = createContext<PlayerCtx | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Track | null>(tracks[0]);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = (track: Track) => {
    setCurrent(track);
    setIsPlaying(true);
  };

  const toggle = () => setIsPlaying((p) => !p);

  const shift = (delta: number) => {
    if (!current) return;
    const idx = tracks.findIndex((t) => t.id === current.id);
    const nextIdx = (idx + delta + tracks.length) % tracks.length;
    setCurrent(tracks[nextIdx]);
    setIsPlaying(true);
  };

  return (
    <Ctx.Provider
      value={{
        current,
        isPlaying,
        play,
        toggle,
        next: () => shift(1),
        prev: () => shift(-1),
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
