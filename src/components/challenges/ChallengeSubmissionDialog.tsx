import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Music } from "lucide-react";
import { submitChallengeEntry } from "@/lib/challenges";
import { supabase } from "@/integrations/supabase/client";

type TrackOption = {
  id: string;
  title: string;
  coverUrl: string;
};

export function ChallengeSubmissionDialog({
  open,
  onOpenChange,
  challengeId,
  userId,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  userId: string;
  onSubmitted: () => void;
}) {
  const [tracks, setTracks] = useState<TrackOption[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!open) return;
    setFetching(true);
    supabase
      .from("tracks")
      .select("id, title, cover_path")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error(error.message);
        } else {
          setTracks(
            (data ?? []).map((t) => ({
              id: t.id,
              title: t.title,
              coverUrl: t.cover_path
                ? supabase.storage.from("track-covers").getPublicUrl(t.cover_path).data.publicUrl
                : "",
            })),
          );
        }
        setFetching(false);
      });
  }, [open, userId]);

  const submit = async () => {
    if (!selectedTrackId) return toast.error("Choisis un morceau");
    setLoading(true);
    try {
      await submitChallengeEntry(challengeId, userId, {
        trackId: selectedTrackId,
        caption: caption.trim(),
      });
      toast.success("Participation envoyée !");
      setSelectedTrackId(null);
      setCaption("");
      onOpenChange(false);
      onSubmitted();
    } catch (err: any) {
      toast.error(err.message ?? "Erreur lors de l’envoi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-border bg-surface-elevated">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-4 w-4 text-primary-glow" /> Participer au défi
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Choisis l’un de tes morceaux et ajoute une légende.
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : tracks.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Tu n’as pas encore de morceau. Uploade-en un depuis la page Upload.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {tracks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTrackId(t.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${
                    selectedTrackId === t.id
                      ? "border-primary bg-primary/10"
                      : "border-border/50 bg-surface/50 hover:bg-white/5"
                  }`}
                >
                  {t.coverUrl ? (
                    <img src={t.coverUrl} alt={t.title} className="h-11 w-11 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface text-[10px] font-bold">
                      ♪
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t.title}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Légende (optionnelle)</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                maxLength={280}
                placeholder="Décris ta participation…"
                className="w-full resize-none rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">{caption.length}/280</p>
            </div>

            <button
              onClick={submit}
              disabled={loading || !selectedTrackId}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-2.5 text-sm font-bold shadow-glow disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Envoi…" : "Envoyer ma participation"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
