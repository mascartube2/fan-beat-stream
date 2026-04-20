import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/tracks";
import { isOnline } from "@/hooks/use-presence";

export const Route = createFileRoute("/members")({
  component: MembersPage,
  head: () => ({ meta: [{ title: "Membres — Pulse" }] }),
});

type Member = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
};

function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: profs }, { data: pres }] = await Promise.all([
      supabase.from("profiles").select("user_id,display_name,avatar_url").order("created_at", { ascending: false }),
      supabase.from("user_presence").select("user_id,last_seen_at"),
    ]);
    const presMap = new Map((pres ?? []).map((p) => [p.user_id, p.last_seen_at as string]));
    setMembers(
      (profs ?? []).map((p) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        last_seen_at: presMap.get(p.user_id) ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("presence-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <div className="px-4 pt-4 pb-24">
      <header className="mb-5 flex items-center gap-2">
        <Users className="h-6 w-6 text-primary-glow" />
        <h1 className="text-2xl font-bold">Membres</h1>
        <span className="ml-auto text-xs text-muted-foreground">{members.length}</span>
      </header>

      {loading ? (
        <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-muted-foreground" />
      ) : members.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Aucun membre pour le moment.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {members.map((m) => {
            const online = isOnline(m.last_seen_at);
            const avatar = m.avatar_url ? publicUrl("track-covers", m.avatar_url) : null;
            return (
              <Link
                key={m.user_id}
                to="/chat"
                className="bg-gradient-card flex flex-col items-center rounded-2xl border border-border/50 p-3 text-center"
              >
                <div className="relative">
                  {avatar ? (
                    <img src={avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-base font-bold">
                      {(m.display_name ?? "U").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span
                    className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${
                      online ? "bg-green-500" : "bg-muted-foreground/50"
                    }`}
                    aria-label={online ? "En ligne" : "Hors ligne"}
                  />
                </div>
                <p className="mt-2 truncate text-xs font-semibold w-full">{m.display_name ?? "Utilisateur"}</p>
                <p className="text-[10px] text-muted-foreground">{online ? "En ligne" : "Hors ligne"}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
