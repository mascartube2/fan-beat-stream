import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { MiniPlayer } from "@/components/player/MiniPlayer";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-32">
      <main className="mx-auto max-w-md">{children}</main>
      <MiniPlayer />
      <BottomNav />
    </div>
  );
}
