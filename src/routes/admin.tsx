import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { Loader2, Check, X, ShieldCheck, Upload as UploadIcon, Trash2, Film, Trophy, Calendar, Hash } from "lucide-react";
import { fetchTracksWithArtists, type TrackWithArtist } from "@/lib/tracks";
import { fetchShorts, type ShortWithAuthor } from "@/lib/shorts";
import { BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { AlbumManager } from "@/components/album/AlbumManager";
import { generateAlbumCoverFile, type CoverStyleId } from "@/lib/album-cover";

type ProfileRow = { user_id: string; display_name: string | null; is_certified: boolean };

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — Mascartube" }] }),
});

type StoryAdmin = {
  id: string;
  user_id: string;
  media_path: string;
  media_type: string;
  created_at: string;
  authorName: string;
  mediaUrl: string;
};

type Request = {
  id: string;
  user_id: string;
  bio: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  display_name?: string;
};

type ArtistOption = { user_id: string; display_name: string };

type PurchaseAdmin = {
  id: string;
  buyer_id: string;
  artist_id: string;
  item_type: "track" | "album";
  track_id: string | null;
  album_id: string | null;
  amount_ar: number;
  artist_share_ar: number;
  platform_share_ar: number;
  payment_method: string;
  payer_number: string;
  payment_reference: string | null;
  status: string;
  created_at: string;
  buyerName?: string;
  artistName?: string;
  itemTitle?: string;
};

type AlbumAdmin = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_path: string | null;
  price_ar: number;
  is_published: boolean;
  created_at: string;
  artistName?: string;
  coverUrl?: string | null;
};

type ChallengeAdmin = {
  id: string;
  title: string;
  description: string | null;
  hashtag: string | null;
  cover_path: string | null;
  starts_at: string;
  ends_at: string;
  prize_description: string | null;
  created_at: string;
  entryCount?: number;
  coverUrl?: string | null;
};

function AdminPage() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [tracks, setTracks] = useState<TrackWithArtist[]>([]);
  const [stories, setStories] = useState<StoryAdmin[]>([]);
  const [shorts, setShorts] = useState<ShortWithAuthor[]>([]);
  const [allProfiles, setAllProfiles] = useState<ProfileRow[]>([]);
  const [profileSearch, setProfileSearch] = useState("");
  const [purchases, setPurchases] = useState<PurchaseAdmin[]>([]);
  const [albums, setAlbums] = useState<AlbumAdmin[]>([]);
  const [challenges, setChallenges] = useState<ChallengeAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Upload form state
  const [selectedArtist, setSelectedArtist] = useState<string>("");
  const [title, setTitle] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  // Challenge form state
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeDesc, setChallengeDesc] = useState("");
  const [challengeHashtag, setChallengeHashtag] = useState("");
  const [challengePrize, setChallengePrize] = useState("");
  const [challengeEnds, setChallengeEnds] = useState("");
  const [challengeCoverFile, setChallengeCoverFile] = useState<File | null>(null);
  const [challengeCreating, setChallengeCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: reqs }, { data: artistRoles }, allTracks, { data: storyRows }, shortRows, { data: allProfs }, { data: purchaseRows }, { data: albumRows }, { data: challengeRows }] = await Promise.all([
      supabase.from("artist_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id").eq("role", "artist"),
      fetchTracksWithArtists(200),
      supabase.from("stories").select("*").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
      fetchShorts({ scope: "all", limit: 100 }),
      supabase.from("profiles").select("user_id, display_name, is_certified").order("display_name"),
      supabase.from("purchases").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("albums").select("*").order("created_at", { ascending: false }),
      supabase.from("challenges").select("*").order("created_at", { ascending: false }),
    ]);
    const nameMap = new Map((allProfs ?? []).map((p) => [p.user_id, p.display_name ?? "Unknown"]));
    setAllProfiles((allProfs ?? []) as ProfileRow[]);
    setRequests(((reqs ?? []) as Request[]).map((r) => ({ ...r, display_name: nameMap.get(r.user_id) })));
    setArtists((artistRoles ?? []).map((r) => ({ user_id: r.user_id, display_name: nameMap.get(r.user_id) ?? "Unknown" })));
    setTracks(allTracks);
    setStories((storyRows ?? []).map((s) => ({
      id: s.id, user_id: s.user_id, media_path: s.media_path, media_type: s.media_type, created_at: s.created_at,
      authorName: nameMap.get(s.user_id) ?? "Unknown",
      mediaUrl: supabase.storage.from("stories").getPublicUrl(s.media_path).data.publicUrl,
    })));
    setShorts(shortRows);
    const trackMap = new Map(allTracks.map((t) => [t.id, t.title]));
    const albumTitleMap = new Map((albumRows ?? []).map((a) => [a.id, a.title]));
    setPurchases(((purchaseRows ?? []) as PurchaseAdmin[]).map((p) => ({
      ...p,
      buyerName: nameMap.get(p.buyer_id) ?? "Utilisateur",
      artistName: nameMap.get(p.artist_id) ?? "Artiste",
      itemTitle: p.item_type === "track" ? (p.track_id ? trackMap.get(p.track_id) : "") : (p.album_id ? albumTitleMap.get(p.album_id) : ""),
    })));
    setAlbums(((albumRows ?? []) as AlbumAdmin[]).map((a) => ({
      ...a,
      artistName: nameMap.get(a.user_id) ?? "Artiste",
      coverUrl: a.cover_path ? supabase.storage.from("track-covers").getPublicUrl(a.cover_path).data.publicUrl : null,
    })));
    const challengeIds = (challengeRows ?? []).map((c) => c.id);
    const { data: entryCountsRows } = challengeIds.length
      ? await supabase.from("challenge_entries").select("challenge_id").in("challenge_id", challengeIds)
      : { data: [] as { challenge_id: string }[] };
    const entryMap = new Map<string, number>();
    for (const e of entryCountsRows ?? []) {
      entryMap.set(e.challenge_id, (entryMap.get(e.challenge_id) ?? 0) + 1);
    }
    setChallenges(((challengeRows ?? []) as ChallengeAdmin[]).map((c) => ({
      ...c,
      entryCount: entryMap.get(c.id) ?? 0,
      coverUrl: c.cover_path ? supabase.storage.from("track-covers").getPublicUrl(c.cover_path).data.publicUrl : null,
    })));
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

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
        <Link to="/auth" search={{ next: undefined }} className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold">
          Sign in
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="px-5 pt-12 text-center">
        <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Admins only</h2>
        <p className="mt-1 text-sm text-muted-foreground">You don't have access to this page.</p>
      </div>
    );
  }

  const review = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    await supabase
      .from("artist_requests")
      .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    await load();
    setBusyId(null);
  };

  const toggleCertified = async (p: ProfileRow) => {
    setBusyId(p.user_id);
    const { error } = await supabase.rpc("set_certified", { _user_id: p.user_id, _value: !p.is_certified });
    if (error) toast.error(error.message);
    else { toast.success(p.is_certified ? "Certification retirée" : "Utilisateur certifié"); await load(); }
    setBusyId(null);
  };



  const deleteTrack = async (t: TrackWithArtist) => {
    if (!confirm(`Supprimer "${t.title}" ?`)) return;
    setBusyId(t.id);
    await supabase.storage.from("audio-tracks").remove([t.audio_path]);
    if (t.cover_path) await supabase.storage.from("track-covers").remove([t.cover_path]);
    await supabase.from("tracks").delete().eq("id", t.id);
    await load();
    setBusyId(null);
  };

  const deleteStory = async (s: StoryAdmin) => {
    if (!confirm(`Supprimer la story de ${s.authorName} ?`)) return;
    setBusyId(s.id);
    try {
      await supabase.storage.from("stories").remove([s.media_path]);
      const { error } = await supabase.from("stories").delete().eq("id", s.id);
      if (error) throw error;
      toast.success("Story supprimée");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const deleteShort = async (s: ShortWithAuthor) => {
    if (!confirm(`Supprimer le réel de ${s.authorName} ?`)) return;
    setBusyId(s.id);
    try {
      await supabase.storage.from("shorts").remove([s.video_path]);
      if (s.thumbnail_path) await supabase.storage.from("shorts").remove([s.thumbnail_path]);
      const { error } = await supabase.from("shorts").delete().eq("id", s.id);
      if (error) throw error;
      toast.success("Réel supprimé");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const adminUpload = async (e: FormEvent) => {
    e.preventDefault();
    setUploadErr(null);
    if (!selectedArtist) return setUploadErr("Choisis un artiste.");
    if (!audio) return setUploadErr("Choisis un fichier audio.");
    setUploading(true);
    try {
      const audioExt = audio.name.split(".").pop() ?? "mp3";
      const audioPath = `${selectedArtist}/${crypto.randomUUID()}.${audioExt}`;
      setUploadMsg("Upload audio…");
      const { error: aErr } = await supabase.storage
        .from("audio-tracks")
        .upload(audioPath, audio, { contentType: audio.type, upsert: false });
      if (aErr) throw aErr;

      let coverPath: string | null = null;
      if (cover) {
        const coverExt = cover.name.split(".").pop() ?? "jpg";
        coverPath = `${selectedArtist}/${crypto.randomUUID()}.${coverExt}`;
        setUploadMsg("Upload cover…");
        const { error: cErr } = await supabase.storage
          .from("track-covers")
          .upload(coverPath, cover, { contentType: cover.type, upsert: false });
        if (cErr) throw cErr;
      }

      let duration: number | null = null;
      try {
        duration = await getAudioDuration(audio);
      } catch {
        // ignore
      }

      setUploadMsg("Enregistrement…");
      const { error: dbErr } = await supabase.from("tracks").insert({
        user_id: selectedArtist,
        title: title.trim() || audio.name.replace(/\.[^.]+$/, ""),
        audio_path: audioPath,
        cover_path: coverPath,
        duration_seconds: duration ? Math.round(duration) : null,
      });
      if (dbErr) throw dbErr;

      setTitle("");
      setAudio(null);
      setCover(null);
      setUploadMsg("✓ Morceau publié.");
      await load();
    } catch (err: any) {
      setUploadErr(err.message ?? "Upload échoué");
      setUploadMsg(null);
    } finally {
      setUploading(false);
    }
  };

  const pending = requests.filter((r) => r.status === "pending");
  const reviewed = requests.filter((r) => r.status !== "pending");
  const pendingPurchases = purchases.filter((p) => p.status === "en_attente");
  const historyPurchases = purchases.filter((p) => p.status !== "en_attente");

  const approvePurchase = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.rpc("approve_purchase", { _purchase_id: id });
    if (error) toast.error(error.message);
    else { toast.success("Achat validé, artiste crédité (85 %)"); await load(); }
    setBusyId(null);
  };

  const rejectPurchase = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.rpc("reject_purchase", { _purchase_id: id });
    if (error) toast.error(error.message);
    else { toast.success("Achat refusé"); await load(); }
    setBusyId(null);
  };

  const createChallenge = async (e: FormEvent) => {
    e.preventDefault();
    if (!challengeTitle.trim() || !challengeEnds) return toast.error("Titre et date de fin requis");
    setChallengeCreating(true);
    try {
      let coverPath: string | null = null;
      if (challengeCoverFile) {
        const ext = challengeCoverFile.name.split(".").pop() ?? "jpg";
        const path = `challenges/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("track-covers").upload(path, challengeCoverFile, { upsert: false });
        if (upErr) throw upErr;
        coverPath = path;
      } else {
        const file = await generateAlbumCoverFile(challengeTitle, "Mascartube", "spotlight", [], { palette: "sunset" });
        const path = `challenges/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage.from("track-covers").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        coverPath = path;
      }
      const hashtag = challengeHashtag.trim().startsWith("#")
        ? challengeHashtag.trim()
        : challengeHashtag.trim()
          ? `#${challengeHashtag.trim()}`
          : null;
      const { error } = await supabase.from("challenges").insert({
        created_by: user.id,
        title: challengeTitle.trim(),
        description: challengeDesc.trim() || null,
        hashtag,
        cover_path: coverPath,
        starts_at: new Date().toISOString(),
        ends_at: new Date(challengeEnds).toISOString(),
        prize_description: challengePrize.trim() || null,
      });
      if (error) throw error;
      toast.success("Défi créé");
      setChallengeTitle("");
      setChallengeDesc("");
      setChallengeHashtag("");
      setChallengePrize("");
      setChallengeEnds("");
      setChallengeCoverFile(null);
      await load();
    } catch (err: any) {
      toast.error(err.message ?? "Erreur");
    } finally {
      setChallengeCreating(false);
    }
  };

  const deleteChallenge = async (id: string) => {
    if (!confirm("Supprimer ce défi ? Les participations associées seront aussi supprimées.")) return;
    setBusyId(id);
    await supabase.from("challenges").delete().eq("id", id);
    toast.success("Défi supprimé");
    await load();
    setBusyId(null);
  };


  return (
    <div className="px-5 pt-6 pb-12">
      <div className="mb-5 flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary-glow" />
        <h1 className="text-2xl font-bold">Admin</h1>
      </div>

      {/* Purchases pending approval */}
      <section className="mb-6 rounded-xl border border-primary/40 bg-primary/5 p-4">
        <h2 className="mb-3 text-sm font-bold">💰 Achats en attente ({pendingPurchases.length})</h2>
        {pendingPurchases.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun achat en attente.</p>
        ) : (
          <ul className="space-y-2">
            {pendingPurchases.map((p) => (
              <li key={p.id} className="rounded-lg border border-border/40 bg-surface p-3 text-xs">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {p.item_type === "track" ? "🎵" : "💿"} {p.itemTitle || "(sans titre)"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Acheteur : <span className="text-foreground">{p.buyerName}</span> · Artiste : <span className="text-foreground">{p.artistName}</span>
                    </p>
                  </div>
                  <p className="shrink-0 font-bold text-primary-glow">{p.amount_ar.toLocaleString()} Ar</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {p.payment_method.toUpperCase()} · Payeur : <span className="text-foreground">{p.payer_number}</span>
                  {p.payment_reference ? <> · Réf : <span className="text-foreground">{p.payment_reference}</span></> : null}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Artiste reçoit : <span className="font-semibold text-foreground">{p.artist_share_ar.toLocaleString()} Ar</span> · Plateforme : {p.platform_share_ar.toLocaleString()} Ar
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => approvePurchase(p.id)}
                    disabled={busyId === p.id}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full bg-gradient-primary py-1.5 text-[11px] font-bold shadow-glow disabled:opacity-60"
                  >
                    <Check className="h-3 w-3" /> Valider
                  </button>
                  <button
                    onClick={() => rejectPurchase(p.id)}
                    disabled={busyId === p.id}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full border border-border py-1.5 text-[11px] font-bold disabled:opacity-60"
                  >
                    <X className="h-3 w-3" /> Refuser
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {historyPurchases.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-[11px] text-muted-foreground">Historique ({historyPurchases.length})</summary>
            <ul className="mt-2 space-y-1">
              {historyPurchases.slice(0, 30).map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg border border-border/30 px-2 py-1 text-[11px]">
                  <span className="truncate">
                    {p.itemTitle} · {p.buyerName} → {p.artistName}
                  </span>
                  <span className={p.status === "valide" ? "text-primary-glow" : "text-muted-foreground"}>
                    {p.status === "valide" ? "✓" : "✕"} {p.amount_ar.toLocaleString()} Ar
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* Challenges management */}
      <section className="mb-6 rounded-xl border border-border/50 bg-gradient-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Trophy className="h-4 w-4 text-primary-glow" /> Défis ({challenges.length})
        </h2>
        <form onSubmit={createChallenge} className="mb-4 space-y-3 rounded-lg border border-border/40 bg-surface/30 p-3">
          <input
            type="text"
            value={challengeTitle}
            onChange={(e) => setChallengeTitle(e.target.value)}
            placeholder="Titre du défi"
            maxLength={120}
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
            required
          />
          <textarea
            value={challengeDesc}
            onChange={(e) => setChallengeDesc(e.target.value)}
            placeholder="Description"
            rows={2}
            maxLength={500}
            className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={challengeHashtag}
                onChange={(e) => setChallengeHashtag(e.target.value)}
                placeholder="Hashtag"
                maxLength={60}
                className="w-full rounded-lg border border-border bg-input py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="datetime-local"
                value={challengeEnds}
                onChange={(e) => setChallengeEnds(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-input py-2 pl-9 pr-3 text-sm"
              />
            </div>
          </div>
          <input
            type="text"
            value={challengePrize}
            onChange={(e) => setChallengePrize(e.target.value)}
            placeholder="Récompense (optionnel)"
            maxLength={200}
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setChallengeCoverFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-[11px] file:font-bold file:text-primary-foreground"
          />
          <button
            type="submit"
            disabled={challengeCreating}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-2.5 text-xs font-bold shadow-glow disabled:opacity-60"
          >
            {challengeCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
            {challengeCreating ? "Création…" : "Créer le défi"}
          </button>
        </form>

        {challenges.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun défi.</p>
        ) : (
          <div className="space-y-2">
            {challenges.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border/40 bg-surface/30 p-2">
                {c.coverUrl ? (
                  <img src={c.coverUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-hero">
                    <Trophy className="h-5 w-5 text-primary-glow/60" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{c.title}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {c.entryCount ?? 0} participation{(c.entryCount ?? 0) === 1 ? "" : "s"} · fin {new Date(c.ends_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                <button
                  onClick={() => deleteChallenge(c.id)}
                  disabled={busyId === c.id}
                  className="rounded-full p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  aria-label="Supprimer"
                >
                  {busyId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Album management */}
      <AlbumManager artists={artists} albums={albums} tracks={tracks} onChanged={load} isAdmin />


      {/* Upload directly for any certified artist */}
      <section className="mb-6 rounded-xl border border-border/50 bg-gradient-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <UploadIcon className="h-4 w-4 text-primary-glow" /> Uploader pour un artiste
        </h2>
        {artists.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun artiste certifié pour le moment.</p>
        ) : (
          <form onSubmit={adminUpload} className="space-y-3">
            <select
              value={selectedArtist}
              onChange={(e) => setSelectedArtist(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
              required
            >
              <option value="">— Choisir un artiste —</option>
              {artists.map((a) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.display_name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Titre du morceau"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
            />
            <input
              type="file"
              accept="audio/*"
              required
              onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-[11px] file:font-bold file:text-primary-foreground"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCover(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-[11px] file:font-bold file:text-primary-foreground"
            />
            {uploadErr && <p className="rounded bg-destructive/15 px-2 py-1 text-xs text-destructive">{uploadErr}</p>}
            {uploadMsg && <p className="text-xs text-muted-foreground">{uploadMsg}</p>}
            <button
              type="submit"
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-2.5 text-xs font-bold shadow-glow disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
              {uploading ? "Upload…" : "Publier"}
            </button>
          </form>
        )}
      </section>

      <h2 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
        Demandes en attente ({pending.length})
      </h2>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune demande.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((r) => (
            <div key={r.id} className="bg-gradient-card rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold">{r.display_name}</p>
              <p className="mt-2 text-sm">{r.bio}</p>
              {r.message && <p className="mt-2 text-xs text-muted-foreground">"{r.message}"</p>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => review(r.id, "approved")}
                  disabled={busyId === r.id}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-primary py-2 text-xs font-bold shadow-glow disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5" /> Approuver
                </button>
                <button
                  onClick={() => review(r.id, "rejected")}
                  disabled={busyId === r.id}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border py-2 text-xs font-bold disabled:opacity-60"
                >
                  <X className="h-3.5 w-3.5" /> Rejeter
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All tracks management */}
      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase text-muted-foreground">
        Tous les morceaux ({tracks.length})
      </h2>
      {tracks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun morceau.</p>
      ) : (
        <div className="space-y-2">
          {tracks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border/40 p-2">
              <img src={t.coverUrl} alt="" className="h-10 w-10 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{t.title}</p>
                <p className="truncate text-[10px] text-muted-foreground">{t.artistName}</p>
              </div>
              <button
                onClick={() => deleteTrack(t)}
                disabled={busyId === t.id}
                className="rounded-full p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                aria-label="Supprimer"
              >
                {busyId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stories moderation */}
      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase text-muted-foreground">
        Stories actives ({stories.length})
      </h2>
      {stories.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune story active.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {stories.map((s) => (
            <div key={s.id} className="relative overflow-hidden rounded-lg border border-border/40">
              {s.media_type === "video" ? (
                <video src={s.mediaUrl} className="aspect-square w-full bg-black object-cover" muted />
              ) : (
                <img src={s.mediaUrl} alt="" className="aspect-square w-full object-cover" />
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-1.5 py-1">
                <span className="truncate text-[10px]">{s.authorName}</span>
                <button
                  onClick={() => deleteStory(s)}
                  disabled={busyId === s.id}
                  className="rounded-full p-0.5 text-destructive hover:bg-white/10 disabled:opacity-50"
                  aria-label="Supprimer"
                >
                  {busyId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shorts moderation */}
      <h2 className="mb-2 mt-6 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
        <Film className="h-3 w-3" /> Réels ({shorts.length})
      </h2>
      {shorts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun réel.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {shorts.map((s) => (
            <div key={s.id} className="relative overflow-hidden rounded-lg border border-border/40">
              <video src={s.videoUrl} poster={s.thumbnailUrl ?? undefined} className="aspect-[9/16] w-full bg-black object-cover" muted />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-1.5 py-1">
                <span className="truncate text-[10px]">{s.authorName}</span>
                <button
                  onClick={() => deleteShort(s)}
                  disabled={busyId === s.id}
                  className="rounded-full p-0.5 text-destructive hover:bg-white/10 disabled:opacity-50"
                  aria-label="Supprimer"
                >
                  {busyId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-xs font-semibold uppercase text-muted-foreground">Historique demandes</h2>
          <div className="space-y-2">
            {reviewed.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-xs"
              >
                <span>{r.display_name}</span>
                <span className={r.status === "approved" ? "text-primary-glow" : "text-destructive"}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Certification */}
      <h2 className="mb-2 mt-6 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
        <BadgeCheck className="h-3 w-3" /> Certification ({allProfiles.filter((p) => p.is_certified).length}/{allProfiles.length})
      </h2>
      <input
        type="text"
        value={profileSearch}
        onChange={(e) => setProfileSearch(e.target.value)}
        placeholder="Rechercher un utilisateur…"
        className="mb-2 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
      />
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {allProfiles
          .filter((p) => !profileSearch || (p.display_name ?? "").toLowerCase().includes(profileSearch.toLowerCase()))
          .slice(0, 50)
          .map((p) => (
            <div key={p.user_id} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-xs">
              <span className="flex items-center gap-1.5 truncate">
                {p.display_name ?? "Sans nom"} {p.is_certified && <BadgeCheck className="h-3.5 w-3.5 fill-sky-500 text-background" />}
              </span>
              <button
                onClick={() => toggleCertified(p)}
                disabled={busyId === p.user_id}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${p.is_certified ? "bg-destructive/20 text-destructive" : "bg-sky-500/20 text-sky-400"}`}
              >
                {busyId === p.user_id ? "…" : p.is_certified ? "Décertifier" : "Certifier"}
              </button>
            </div>
          ))}
      </div>
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
