import { Link } from "@tanstack/react-router";
import { Trophy, Clock, Users } from "lucide-react";
import { timeLeftText, type Challenge } from "@/lib/challenges";

export function ChallengeCard({ challenge, entryCount }: { challenge: Challenge; entryCount?: number }) {
  return (
    <Link
      to="/challenge/$challengeId"
      params={{ challengeId: challenge.id }}
      className="group block overflow-hidden rounded-2xl border border-border/50 bg-gradient-card shadow-soft transition hover:border-primary/40"
    >
      <div className="relative h-28 overflow-hidden">
        {challenge.coverUrl ? (
          <img
            src={challenge.coverUrl}
            alt={challenge.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-hero">
            <Trophy className="h-10 w-10 text-primary-glow/60" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3">
          <h3 className="truncate text-base font-bold text-foreground">{challenge.title}</h3>
          {challenge.hashtag && (
            <p className="truncate text-xs font-semibold text-primary-glow">{challenge.hashtag}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between p-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {timeLeftText(challenge.endsAt)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {entryCount ?? 0} participation{entryCount === 1 ? "" : "s"}
        </span>
      </div>
      {challenge.prizeDescription && (
        <p className="truncate px-3 pb-3 text-[11px] font-medium text-foreground/80">
          🎁 {challenge.prizeDescription}
        </p>
      )}
    </Link>
  );
}
