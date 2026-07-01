import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { TRACK_GENRES } from "@/lib/tracks";
import { Loader2, Upload as UploadIcon, Music } from "lucide-react";


export const Route = createFileRoute("/upload")({
  component: UploadPage,
  head: () => ({ meta: [{ title: "Upload — Pulse" }] }),
});

function UploadPage() {
  const { user, isArtist, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<string>("");
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [forSale, setForSale] = useState(false);
  const [priceAr, setPriceAr] = useState<number>(500);
  const [loading, setLoading] = useState(false);

  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-5 pt-12 text-center">
        <p className="text-sm text-muted-foreground">You need an account to upload.</p>
        <Link to="/auth" className="mt-4 inline-block rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold">
          Sign in
        </Link>
      </div>
    );
  }

  if (!isArtist) {
    return (
      <div className="px-5 pt-12 text-center">
        <Music className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Become an artist first</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a request to admins to upload your tracks.
        </p>
        <Link
          to="/become-artist"
          className="mt-5 inline-block rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold shadow-glow"
        >
          Apply to be an artist
        </Link>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!audio) {
      setError("Please pick an audio file");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const audioExt = audio.name.split(".").pop() ?? "mp3";
      const audioPath = `${user.id}/${crypto.randomUUID()}.${audioExt}`;
      setProgress("Uploading audio…");
      const { error: aErr } = await supabase.storage
        .from("audio-tracks")
        .upload(audioPath, audio, { contentType: audio.type, upsert: false });
      if (aErr) throw aErr;

      let coverPath: string | null = null;
      if (cover) {
        const coverExt = cover.name.split(".").pop() ?? "jpg";
        coverPath = `${user.id}/${crypto.randomUUID()}.${coverExt}`;
        setProgress("Uploading cover…");
        const { error: cErr } = await supabase.storage
          .from("track-covers")
          .upload(coverPath, cover, { contentType: cover.type, upsert: false });
        if (cErr) throw cErr;
      }

      // Get duration from audio file
      let duration: number | null = null;
      try {
        duration = await getAudioDuration(audio);
      } catch {
        // ignore
      }

      setProgress("Saving track…");
      const { error: dbErr } = await supabase.from("tracks").insert({
        user_id: user.id,
        title: title.trim() || audio.name.replace(/\.[^.]+$/, ""),
        audio_path: audioPath,
        cover_path: coverPath,
        duration_seconds: duration ? Math.round(duration) : null,
        genre: genre || null,
        is_for_sale: forSale,
        price_ar: forSale ? Math.max(100, Math.round(priceAr)) : 500,
      });

      if (dbErr) throw dbErr;

      navigate({ to: "/library" });
    } catch (err: any) {
      setError(err.message ?? "Upload failed");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="px-5 pt-6 pb-12">
      <h1 className="text-2xl font-bold">Upload a track</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">Share your sound with the community.</p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Track title"
            className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Genre musical</label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">— Choisir un genre —</option>
            {TRACK_GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Audio file (mp3, wav…)</label>

          <input
            type="file"
            accept="audio/*"
            required
            onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
            className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Cover image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
            className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground"
          />
        </div>

        <div className="rounded-xl border border-border/50 bg-gradient-card p-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={forSale}
              onChange={(e) => setForSale(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Mettre en vente ce morceau (Pay-Per-Download)
          </label>
          {forSale && (
            <div className="mt-3">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Prix en Ariary (défaut 500 Ar)</label>
              <input
                type="number"
                min={100}
                step={100}
                value={priceAr}
                onChange={(e) => setPriceAr(Number(e.target.value) || 500)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Tu recevras <span className="font-bold text-foreground">{Math.floor(priceAr * 0.85).toLocaleString()} Ar</span> (85 %) par vente.
              </p>
            </div>
          )}
        </div>


        {error && <p className="rounded-lg bg-destructive/15 px-3 py-2 text-xs text-destructive">{error}</p>}
        {progress && <p className="text-xs text-muted-foreground">{progress}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-3 text-sm font-bold shadow-glow disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
          {loading ? "Uploading…" : "Publish track"}
        </button>
      </form>
    </div>
  );
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => resolve(a.duration);
    a.onerror = () => reject(new Error("Could not read audio metadata"));
    a.src = URL.createObjectURL(file);
  });
}
