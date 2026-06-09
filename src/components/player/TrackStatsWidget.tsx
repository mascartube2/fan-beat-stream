import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame, TrendingUp } from "lucide-react";

function fmtCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export function TrackStatsWidget({ trackId, initialPlays }: { trackId: string; initialPlays: number }) {
  const [totalPlays, setTotalPlays] = useState(initialPlays);
  const [dailyCount, setDailyCount] = useState(0);

  // Fetch today's daily plays once on mount / track change
  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      const { data } = await supabase
        .from("track_daily_plays")
        .select("count")
        .eq("track_id", trackId)
        .eq("day", today)
        .maybeSingle();
      if (!cancelled) setDailyCount(data?.count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [trackId]);

  // Realtime: listen to total plays updates on tracks table
  useEffect(() => {
    const channel = supabase
      .channel(`track-plays-${trackId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tracks", filter: `id=eq.${trackId}` },
        (payload) => {
          const newPlays = (payload.new as Record<string, unknown>)?.plays as number | undefined;
          if (typeof newPlays === "number") setTotalPlays(newPlays);
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [trackId]);

  // Realtime: listen to daily plays updates
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const channel = supabase
      .channel(`track-daily-${trackId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "track_daily_plays", filter: `track_id=eq.${trackId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown> | null;
          if (!row) return;
          if (row.day === today) {
            const c = row.count as number | undefined;
            if (typeof c === "number") setDailyCount(c);
          }
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [trackId]);

  // Daily progress: simple bar with a soft target (e.g. 50 plays/day)
  const dailyTarget = 50;
  const dailyPct = Math.min((dailyCount / dailyTarget) * 100, 100);

  return (
    <div className="flex items-center gap-2 px-1">
      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
        <Flame className="h-3 w-3 text-primary-glow" />
        <span className="tabular-nums">{fmtCount(totalPlays)}</span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex flex-1 items-center gap-1.5">
        <TrendingUp className="h-3 w-3 text-accent" />
        <span className="text-[10px] tabular-nums text-muted-foreground">+{dailyCount}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-primary transition-all duration-500"
            style={{ width: `${dailyPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
