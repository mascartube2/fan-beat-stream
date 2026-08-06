import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, Loader2, Plus } from "lucide-react";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { fetchActiveChallenges, type Challenge } from "@/lib/challenges";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";

export const Route = createFileRoute("/challenges")({
  component: ChallengesPage,
  head: () => ({
    meta: [
      { title: "Défis — Mascartube" },
      { name: "description", content: "Participe aux défis musicaux Mascartube et fais voter la communauté." },
    ],
  }),
});

function ChallengesPage() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const rows = await fetchActiveChallenges();
    setChallenges(rows);
    if (rows.length) {
      const { data } = await supabase
        .from("challenge_entries")
        .select("challenge_id")
        .in(
          "challenge_id",
          rows.map((r) => r.id),
        );
      const counts: Record<string, number> = {};
      for (const e of data ?? []) {
        counts[e.challenge_id] = (counts[e.challenge_id] ?? 0) + 1;
      }
      setEntryCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Défis</h1>
        {user && (
          <Link
            to="/discover"
            className="flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1.5 text-[11px] font-bold shadow-glow"
          >
            <Plus className="h-3.5 w-3.5" /> Découvrir
          </Link>
        )}
      </div>

      <p className="mb-5 text-sm text-muted-foreground">
        Rejoins un défi musical, publie ta participation et fais voter la communauté.
      </p>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : challenges.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-gradient-card p-6 text-center">
          <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Aucun défi en cours</h2>
          <p className="mt-1 text-xs text-muted-foreground">Reviens bientôt ou propose un thème aux admins.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} entryCount={entryCounts[c.id] ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}
