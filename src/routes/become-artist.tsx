import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { Loader2, Music, CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/become-artist")({
  component: BecomeArtistPage,
  head: () => ({ meta: [{ title: "Become an artist — Pulse" }] }),
});

type Status = "pending" | "approved" | "rejected";

function BecomeArtistPage() {
  const { user, isArtist, loading: authLoading } = useAuth();
  const [bio, setBio] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<{ status: Status; created_at: string } | null>(null);
  const [loadingReq, setLoadingReq] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoadingReq(false);
      return;
    }
    supabase
      .from("artist_requests")
      .select("status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setExisting({ status: data.status as Status, created_at: data.created_at });
        setLoadingReq(false);
      });
  }, [user]);

  if (authLoading || loadingReq) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-5 pt-12 text-center">
        <p className="text-sm text-muted-foreground">Sign in to apply.</p>
        <Link to="/auth" className="mt-4 inline-block rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold">
          Sign in
        </Link>
      </div>
    );
  }

  if (isArtist) {
    return (
      <div className="px-5 pt-12 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary-glow" />
        <h2 className="text-lg font-semibold">You're an artist!</h2>
        <Link to="/upload" className="mt-5 inline-block rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold shadow-glow">
          Upload a track
        </Link>
      </div>
    );
  }

  if (existing && existing.status === "pending") {
    return (
      <div className="px-5 pt-12 text-center">
        <Clock className="mx-auto mb-3 h-10 w-10 text-accent" />
        <h2 className="text-lg font-semibold">Request pending</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          An admin will review your application soon.
        </p>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (bio.trim().length < 10) {
      setError("Tell us a bit more about yourself (min 10 chars).");
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: err } = await supabase.from("artist_requests").insert({
      user_id: user.id,
      bio: bio.trim(),
      message: message.trim() || null,
    });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setExisting({ status: "pending", created_at: new Date().toISOString() });
  };

  return (
    <div className="px-5 pt-6 pb-12">
      <Music className="mb-3 h-8 w-8 text-primary-glow" />
      <h1 className="text-2xl font-bold">Become an artist</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Send a request to admins. Once approved, you'll be able to upload your tracks.
      </p>

      {existing?.status === "rejected" && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/15 px-3 py-2 text-xs text-destructive">
          <XCircle className="h-4 w-4" /> Your previous request was rejected. You can try again.
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Artist bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Who are you? What do you make?"
            className="w-full resize-none rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Message to admin (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Anything else we should know?"
            className="w-full resize-none rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {error && <p className="rounded-lg bg-destructive/15 px-3 py-2 text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-3 text-sm font-bold shadow-glow disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Send request
        </button>
      </form>
    </div>
  );
}
