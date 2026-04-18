import { artists } from "@/lib/mock-data";
import { Plus } from "lucide-react";

export function StoriesRow() {
  return (
    <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
      <button className="flex w-16 shrink-0 flex-col items-center gap-1.5">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border bg-surface">
          <Plus className="h-5 w-5 text-muted-foreground" />
        </span>
        <span className="text-[10px] text-muted-foreground">You</span>
      </button>
      {artists.map((a, i) => (
        <button key={a.id} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
          <span
            className={`relative h-16 w-16 rounded-full p-[2px] ${i === 0 ? "bg-gradient-primary animate-pulse-ring" : "bg-gradient-primary"}`}
          >
            <img
              src={a.avatar}
              alt={a.name}
              width={60}
              height={60}
              loading="lazy"
              className="h-full w-full rounded-full border-2 border-background object-cover"
            />
            {i === 0 && (
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-destructive px-1.5 py-0 text-[8px] font-bold uppercase">
                Live
              </span>
            )}
          </span>
          <span className="w-full truncate text-[10px] text-foreground/80">{a.name.split(" ")[0]}</span>
        </button>
      ))}
    </div>
  );
}
