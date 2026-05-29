import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isOnline } from "@/hooks/use-presence";
import { COUNTRIES, countryByCode } from "@/lib/countries";

type Member = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  last_seen_at: string | null;
};

export function UsersPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [{ data: profs }, { data: pres }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id,display_name,avatar_url,country")
          .order("created_at", { ascending: false })
          .limit(80),
        supabase.from("user_presence").select("user_id,last_seen_at"),
      ]);
      if (!alive) return;
      const map = new Map((pres ?? []).map((p) => [p.user_id, p.last_seen_at as string]));
      setMembers(
        (profs ?? []).map((p) => ({
          user_id: p.user_id,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          country: (p as { country: string | null }).country,
          last_seen_at: map.get(p.user_id) ?? null,
        })),
      );
    };
    load();
    const ch = supabase
      .channel("users-panel-presence")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, () => load())
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  const availableCountries = useMemo(() => {
    const set = new Set(members.map((m) => m.country).filter(Boolean) as string[]);
    return COUNTRIES.filter((c) => set.has(c.code));
  }, [members]);

  const filtered = useMemo(
    () => (filter === "ALL" ? members : members.filter((m) => m.country === filter)),
    [members, filter],
  );

  // Sort: online first, then alpha
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const ao = isOnline(a.last_seen_at) ? 0 : 1;
        const bo = isOnline(b.last_seen_at) ? 0 : 1;
        if (ao !== bo) return ao - bo;
        return (a.display_name ?? "").localeCompare(b.display_name ?? "");
      }),
    [filtered],
  );

  if (members.length === 0) return null;

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary-glow" />
          <h2 className="text-sm font-bold">Utilisateurs</h2>
          <span className="text-[10px] text-muted-foreground">{sorted.length}</span>
        </div>
        <Link to="/members" className="text-[11px] font-semibold text-primary-glow">
          Tout voir
        </Link>
      </div>

      {availableCountries.length > 1 && (
        <div className="mb-2 -mx-4 overflow-x-auto px-4">
          <div className="flex gap-1.5 pb-1">
            <button
              onClick={() => setFilter("ALL")}
              className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                filter === "ALL" ? "border-primary bg-primary/20 text-primary-glow" : "border-border/60 bg-surface"
              }`}
            >
              🌍 Tous
            </button>
            {availableCountries.map((c) => (
              <button
                key={c.code}
                onClick={() => setFilter(c.code)}
                className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  filter === c.code ? "border-primary bg-primary/20 text-primary-glow" : "border-border/60 bg-surface"
                }`}
              >
                {c.flag} {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-3 pb-2">
          {sorted.map((m) => {
            const online = isOnline(m.last_seen_at);
            const country = countryByCode(m.country);
            return (
              <Link
                key={m.user_id}
                to="/chat"
                className="flex w-16 shrink-0 flex-col items-center text-center"
              >
                <div className="relative">
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url.startsWith("http") ? m.avatar_url : ""}
                      alt=""
                      className={`h-14 w-14 rounded-full object-cover ring-2 ${online ? "ring-emerald-500" : "ring-border/40"}`}
                    />
                  ) : (
                    <span className={`flex h-14 w-14 items-center justify-center rounded-full bg-surface text-sm font-bold ring-2 ${online ? "ring-emerald-500" : "ring-border/40"}`}>
                      {(m.display_name ?? "U").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  {country && (
                    <span className="absolute -bottom-1 -right-1 rounded-full border border-background bg-background text-sm leading-none">
                      {country.flag}
                    </span>
                  )}
                  <span
                    className={`absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-background ${
                      online ? "bg-emerald-500" : "bg-muted-foreground/50"
                    }`}
                  />
                </div>
                <p className="mt-1.5 w-full truncate text-[10px] font-semibold">
                  {m.display_name ?? "User"}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {online ? "En ligne" : "Hors ligne"}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
