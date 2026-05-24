import { Smile } from "lucide-react";
import { useState } from "react";

const QUICK = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

export function ReactionPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
        aria-label="Réagir"
      >
        <Smile className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute -top-10 left-1/2 z-20 flex -translate-x-1/2 gap-1 rounded-full border border-border/50 bg-background/95 px-2 py-1 shadow-glow backdrop-blur">
          {QUICK.map((e) => (
            <button
              key={e}
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
              className="text-lg transition hover:scale-125"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
