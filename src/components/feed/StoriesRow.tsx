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
      <p className="flex items-center text-[11px] text-muted-foreground">
        No stories yet — be the first to go live.
      </p>
    </div>
  );
}
