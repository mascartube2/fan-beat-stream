import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Radio } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";

type Range = "24h" | "7d";

export function MediaViewsChart({
  mediaType,
  mediaId,
  className,
}: {
  mediaType: "short" | "post";
  mediaId: string;
  className?: string;
}) {
  const { isAdmin } = useAuth();
  const [range, setRange] = useState<Range>("24h");
  const [events, setEvents] = useState<string[]>([]); // viewed_at ISO strings
  const [live, setLive] = useState(false);

  // Fetch
  useEffect(() => {
    let cancelled = false;
    const since = new Date(Date.now() - (range === "24h" ? 24 * 3600_000 : 7 * 86400_000)).toISOString();
    (async () => {
      const { data } = await supabase
        .from("media_view_events")
        .select("viewed_at")
        .eq("media_type", mediaType)
        .eq("media_id", mediaId)
        .gte("viewed_at", since)
        .order("viewed_at", { ascending: true })
        .limit(5000);
      if (!cancelled) setEvents((data ?? []).map((r) => r.viewed_at as string));
    })();
    return () => { cancelled = true; };
  }, [mediaType, mediaId, range]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`media-views-${mediaType}-${mediaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "media_view_events", filter: `media_id=eq.${mediaId}` },
        (payload) => {
          const row = payload.new as { media_type: string; viewed_at: string };
          if (row.media_type !== mediaType) return;
          setEvents((prev) => [...prev, row.viewed_at]);
          setLive(true);
          setTimeout(() => setLive(false), 900);
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [mediaType, mediaId]);

  const data = useMemo(() => buildBuckets(events, range), [events, range]);
  const total = events.length;

  if (!isAdmin) return null;

  return (
    <div className={`rounded-xl border border-border/60 bg-gradient-card p-2.5 ${className ?? ""}`}>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5 text-primary-glow" />
          Vues — {range === "24h" ? "24 h" : "7 j"}
          <span className="tabular-nums text-foreground">· {total}</span>
          {live && (
            <span className="ml-1 flex items-center gap-1 rounded-full bg-destructive/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-destructive">
              <Radio className="h-2.5 w-2.5 animate-pulse" /> live
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {(["24h", "7d"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
                range === r ? "bg-gradient-primary text-foreground shadow-glow" : "bg-white/5 text-muted-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`mvc-${mediaId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" hide />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 11,
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              formatter={(v: number) => [v, "vues"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill={`url(#mvc-${mediaId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function buildBuckets(events: string[], range: Range) {
  const now = Date.now();
  if (range === "24h") {
    const buckets = Array.from({ length: 24 }, (_, i) => {
      const t = new Date(now - (23 - i) * 3600_000);
      t.setMinutes(0, 0, 0);
      return { ts: t.getTime(), label: `${t.getHours()}h`, count: 0 };
    });
    for (const iso of events) {
      const t = new Date(iso).getTime();
      const idx = 23 - Math.floor((now - t) / 3600_000);
      if (idx >= 0 && idx < 24) buckets[idx].count += 1;
    }
    return buckets;
  }
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400_000);
    d.setHours(0, 0, 0, 0);
    return { ts: d.getTime(), label: d.toLocaleDateString(undefined, { weekday: "short" }), count: 0 };
  });
  for (const iso of events) {
    const t = new Date(iso).getTime();
    const idx = 6 - Math.floor((now - t) / 86400_000);
    if (idx >= 0 && idx < 7) buckets[idx].count += 1;
  }
  return buckets;
}
