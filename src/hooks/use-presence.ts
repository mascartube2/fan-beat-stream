import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_MS = 30_000;

export function usePresenceHeartbeat(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    const beat = async () => {
      await supabase
        .from("user_presence")
        .upsert({ user_id: userId, last_seen_at: new Date().toISOString() });
    };
    beat();
    const i = setInterval(beat, HEARTBEAT_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(i);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [userId]);
}

export function isOnline(lastSeenIso: string | null | undefined): boolean {
  if (!lastSeenIso) return false;
  return Date.now() - new Date(lastSeenIso).getTime() < 90_000;
}
