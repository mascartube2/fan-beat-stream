import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { useAuth } from "@/components/auth/AuthContext";
import { usePresenceHeartbeat } from "@/hooks/use-presence";
import { SplashScreen } from "@/components/brand/SplashScreen";
import { CallProvider } from "@/components/chat/CallProvider";

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  usePresenceHeartbeat(user?.id);
  return (
    <CallProvider>
      <div className="min-h-screen pb-32">
        <SplashScreen />
        <main className="mx-auto max-w-md">{children}</main>
        <MiniPlayer />
        <BottomNav />
      </div>
    </CallProvider>
  );
}
