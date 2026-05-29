import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "mt_visit_counted";

export function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const stored = sessionStorage.getItem(SESSION_KEY);
        if (stored !== today) {
          const { data } = await supabase.rpc("increment_daily_visit");
          sessionStorage.setItem(SESSION_KEY, today);
          if (!cancelled && typeof data === "number") setCount(data);
        } else {
          const { data } = await supabase.rpc("get_today_visits");
          if (!cancelled && typeof data === "number") setCount(data);
        }
      } catch {
        /* ignore */
      }
    };
    run();
    const ch = supabase
      .channel("daily-visits-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_visits" }, (payload) => {
        const row = payload.new as { day: string; count: number } | undefined;
        if (!row) return;
        const today = new Date().toISOString().slice(0, 10);
        if (row.day === today) setCount(row.count);
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
          <Users className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Visiteurs aujourd'hui</p>
          <p className="text-sm font-bold">{count === null ? "…" : count.toLocaleString("fr-FR")}</p>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground">Reset à minuit</span>
    </div>
  );
}
