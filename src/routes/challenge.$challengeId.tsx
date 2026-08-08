import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trophy, Loader2, Clock, Users, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchChallengeById,
  fetchChallengeEntries,
  hasUserVoted,
  toggleChallengeVote,
  deleteChallengeEntry,
  type Challenge,
  type ChallengeEntry,
} from "@/lib/challenges";
import { ChallengeEntryCard } from "@/components/challenges/ChallengeEntryCard";
import { ChallengeSubmissionDialog } from "@/components/challenges/ChallengeSubmissionDialog";
import { ShareMenu } from "@/components/share/ShareMenu";
import { useAuth } from "@/components/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/challenge/$challengeId")({
  component: ChallengeDetailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    entry: typeof search.entry === "string" ? search.entry : undefined,
  }),
  loaderDeps: ({ search }) => ({ entry: search.entry }),
  loader: async ({ params, deps }) => {
    const challenge = await fetchChallengeById(params.challengeId);
    let entryCover: string | null = null;
    let entryTitle: string | null = null;
    if (deps.entry) {
      const entries = await fetchChallengeEntries(params.challengeId);
      const found = entries.find((e) => e.id === deps.entry);
      entryCover = found?.track?.coverUrl ?? null;
      entryTitle = found ? `${found.authorName}${found.track ? ` — ${found.track.title}` : ""}` : null;
    }
    return {
      title: challenge?.title ?? null,
      description: challenge?.description ?? null,
      coverUrl: challenge?.coverUrl ?? null,
      entryCover,
      entryTitle,
    };
  },
  head: ({ loaderData }) => {
    const base = loaderData?.title ? `${loaderData.title} — Défi Mascartube` : "Défi — Mascartube";
    const title = loaderData?.entryTitle ? `${loaderData.entryTitle} · ${base}` : base;
    const description =
      loaderData?.entryTitle
        ? `Écoute et vote pour la participation de ${loaderData.entryTitle} au défi Mascartube.`
        : (loaderData?.description ?? "Participe à ce défi musical sur Mascartube.");
    const image = loaderData?.entryCover ?? loaderData?.coverUrl ?? null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image?.startsWith("https://")
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
    };
  },
});

function ChallengeDetailPage() {
  const { challengeId } = Route.useParams();
  const { entry: highlightedEntryId } = Route.useSearch();
  const { user } = useAuth();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const [c, e] = await Promise.all([fetchChallengeById(challengeId), fetchChallengeEntries(challengeId)]);
    setChallenge(c);
    setEntries(e);
    if (user) {
      const votes = await Promise.all(e.map((entry) => hasUserVoted(entry.id, user.id)));
      const voted = new Set<string>();
      e.forEach((entry, i) => {
        if (votes[i]) voted.add(entry.id);
      });
      setUserVotes(voted);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [challengeId, user?.id]);

  useEffect(() => {
    if (!highlightedEntryId || loading) return;
    const el = document.getElementById(`entry-${highlightedEntryId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedEntryId, loading, entries.length]);


  useEffect(() => {
    const ch = supabase
      .channel(`challenge-${challengeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "challenge_entries", filter: `challenge_id=eq.${challengeId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "challenge_entries", filter: `challenge_id=eq.${challengeId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "challenge_entries", filter: `challenge_id=eq.${challengeId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [challengeId]);

  const handleVote = async (entryId: string) => {
    if (!user) return toast.error("Connecte-toi pour voter");
    const voted = userVotes.has(entryId);
    setUserVotes((prev) => {
      const next = new Set(prev);
      if (voted) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, votesCount: e.votesCount + (voted ? -1 : 1) } : e)),
    );
    await toggleChallengeVote(entryId, user.id, voted);
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("Supprimer ta participation ?")) return;
    await deleteChallengeEntry(entryId);
    toast.success("Participation supprimée");
    await load();
  };

  const userEntry = user ? entries.find((e) => e.userId === user.id) : null;
  const isActive = challenge ? new Date(challenge.endsAt).getTime() > Date.now() : false;

  return (
    <div className="px-4 pt-4 pb-24">
      <Link to="/challenges" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux défis
      </Link>

      {loading || !challenge ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <>
          <div className="mb-5 overflow-hidden rounded-2xl border border-border/50 bg-gradient-card">
            <div className="relative h-36 overflow-hidden">
              {challenge.coverUrl ? (
                <img src={challenge.coverUrl} alt={challenge.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-hero">
                  <Trophy className="h-14 w-14 text-primary-glow/60" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <h1 className="text-xl font-bold">{challenge.title}</h1>
                {challenge.hashtag && <p className="text-sm font-semibold text-primary-glow">{challenge.hashtag}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(challenge.endsAt).getTime() > Date.now() ? "En cours" : "Terminé"}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {entries.length} participation{entries.length === 1 ? "" : "s"}
              </span>
              <ShareMenu
                url={`/challenge/${challenge.id}`}
                title={challenge.title}
                text={challenge.description ?? challenge.title}
                className="rounded-full p-1.5 hover:bg-white/5"
              />
            </div>
            {challenge.description && (
              <p className="px-4 pb-4 text-sm leading-relaxed text-foreground/90">{challenge.description}</p>
            )}
            {challenge.prizeDescription && (
              <p className="px-4 pb-4 text-[11px] font-medium text-foreground/80">🎁 {challenge.prizeDescription}</p>
            )}
          </div>

          {isActive && user && !userEntry && (
            <button
              onClick={() => setSubmitOpen(true)}
              className="mb-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-3 text-sm font-bold shadow-glow"
            >
              <Share2 className="h-4 w-4" /> Participer au défi
            </button>
          )}

          {isActive && !user && (
            <Link
              to="/auth"
              search={{ next: undefined }}
              className="mb-5 flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-bold"
            >
              Connecte-toi pour participer
            </Link>
          )}

          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Classement</h2>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune participation pour l’instant — sois le premier !</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, index) => (
                <ChallengeEntryCard
                  key={entry.id}
                  entry={entry}
                  rank={index + 1}
                  voted={userVotes.has(entry.id)}
                  onVote={() => handleVote(entry.id)}
                  onDelete={entry.userId === user?.id ? () => handleDelete(entry.id) : undefined}
                />
              ))}
            </div>
          )}

          {challenge && user && (
            <ChallengeSubmissionDialog
              open={submitOpen}
              onOpenChange={setSubmitOpen}
              challengeId={challenge.id}
              userId={user.id}
              onSubmitted={load}
            />
          )}
        </>
      )}
    </div>
  );
}
