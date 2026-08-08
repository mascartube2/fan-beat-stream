import { Heart, Trash2, Play, Medal } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePlayer } from "@/components/player/PlayerContext";
import { CertifiedBadge } from "@/components/brand/CertifiedBadge";
import { ShareMenu } from "@/components/share/ShareMenu";
import { formatCount, type ChallengeEntry } from "@/lib/challenges";

export function ChallengeEntryCard({
  entry,
  rank,
  voted,
  onVote,
  onDelete,
  challengeTitle,
  highlighted,
}: {
  entry: ChallengeEntry;
  rank: number;
  voted: boolean;
  onVote: () => void;
  onDelete?: () => void;
  challengeTitle?: string;
  highlighted?: boolean;
}) {
  const { playTrack } = usePlayer();

  const medal = rank <= 3;
  const rankColor = rank === 1 ? "text-yellow-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "text-muted-foreground";
  const shareUrl = `/challenge/${entry.challengeId}?entry=${entry.id}`;
  const shareText = `${entry.authorName} participe${challengeTitle ? ` au défi ${challengeTitle}` : " au défi"}${entry.track ? ` avec « ${entry.track.title} »` : ""} — #${rank} au classement`;

  return (
    <article
      id={`entry-${entry.id}`}
      className={`scroll-mt-24 rounded-2xl border bg-gradient-card p-3 shadow-soft transition ${
        highlighted ? "border-primary ring-2 ring-primary/40" : "border-border/50"
      }`}
    >
      <div className="mb-2 flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-surface text-sm font-bold ${rankColor}`}>
          {medal ? <Medal className="h-4 w-4" /> : rank}
        </div>

        <Link to="/u/$userId" params={{ userId: entry.userId }} className="flex min-w-0 flex-1 items-center gap-2">
          {entry.authorAvatar ? (
            <img src={entry.authorAvatar} alt={entry.authorName} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-[10px] font-bold">
              {entry.authorName.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {entry.authorName}
              {entry.authorIsArtist && <CertifiedBadge />}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">#{rank} au classement</p>
          </div>
        </Link>
        <ShareMenu
          url={shareUrl}
          title={shareText}
          text={shareText}
          authorUrl={`/u/${entry.userId}`}
          authorName={entry.authorName}
          coverUrl={entry.track?.coverUrl ?? null}
          cardBadge={challengeTitle ? `Défi ${challengeTitle}` : "Défi Mascartube"}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-white/5"
        />

        {onDelete && (
          <button
            onClick={onDelete}
            className="rounded-full p-1.5 text-destructive hover:bg-destructive/10"
            aria-label="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>


      {entry.caption && <p className="mb-2 text-sm leading-relaxed text-foreground/90">{entry.caption}</p>}

      {entry.track && (
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-surface/50 p-2">
          <img
            src={entry.track.coverUrl}
            alt={entry.track.title}
            className="h-14 w-14 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{entry.track.title}</p>
            <p className="truncate text-xs text-muted-foreground">{entry.track.artistName}</p>
          </div>
          <button
            onClick={() =>
              playTrack(
                {
                  id: entry.track!.id,
                  title: entry.track!.title,
                  artistName: entry.track!.artistName,
                  cover: entry.track!.coverUrl,
                  audioUrl: entry.track!.audioUrl,
                  plays: 0,
                },
                [],
              )
            }
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary shadow-glow"
            aria-label="Lire"
          >
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          </button>
        </div>
      )}

      <button
        onClick={onVote}
        className="flex w-full items-center justify-center gap-1.5 rounded-full border border-border bg-surface/30 py-2 text-xs font-semibold transition hover:bg-white/5"
      >
        <Heart className={`h-4 w-4 ${voted ? "fill-primary-glow text-primary-glow" : ""}`} />
        {formatCount(entry.votesCount)} vote{entry.votesCount === 1 ? "" : "s"}
      </button>
    </article>
  );
}
