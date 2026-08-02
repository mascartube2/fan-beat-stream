import { useState, useEffect, useRef, type FormEvent } from "react";
import { Loader2, Disc3, Trash2, Plus, Eye, EyeOff, Music4, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TrackWithArtist } from "@/lib/tracks";
import { uploadPreview, uploadAlbumTracks, PREVIEW_BUCKET, formatSeconds } from "@/lib/albums";
import { drawAlbumCover, generateAlbumCoverFile } from "@/lib/album-cover";
import { PreviewPlayer } from "@/components/album/PreviewPlayer";


export const MIN_ALBUM_TRACKS = 7;
export const MAX_ALBUM_TRACKS = 10;

type ArtistOption = { user_id: string; display_name: string };

export type AlbumRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_path: string | null;
  price_ar: number;
  is_published: boolean;
  created_at: string;
  preview_path?: string | null;
  preview_duration_seconds?: number | null;
  artistName?: string;
  coverUrl?: string | null;
};


export function AlbumManager({
  artists,
  albums,
  tracks,
  onChanged,
  isAdmin = false,
  currentUserId,
}: {
  artists?: ArtistOption[];
  albums: AlbumRow[];
  tracks: TrackWithArtist[];
  onChanged: () => void | Promise<void>;
  isAdmin?: boolean;
  currentUserId?: string;
}) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceAr, setPriceAr] = useState<number>(5000);
  const [cover, setCover] = useState<File | null>(null);
  const [slots, setSlots] = useState<{ file: File | null; title: string }[]>(
    Array.from({ length: MAX_ALBUM_TRACKS }, () => ({ file: null, title: "" })),
  );
  const [slotStatus, setSlotStatus] = useState<Record<number, "uploading" | "done">>({});
  const [artistId, setArtistId] = useState<string>(currentUserId ?? "");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [coverStyle, setCoverStyle] = useState<CoverStyleId>("vinyl");
  const styleCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  const visibleAlbums = isAdmin ? albums : albums.filter((a) => a.user_id === currentUserId);
  const filledCount = slots.filter((s) => s.file).length;
  const artistLabel =
    (isAdmin ? artists?.find((a) => a.user_id === artistId)?.display_name : undefined) ?? "MascarTube";
  const updateSlot = (index: number, patch: Partial<{ file: File | null; title: string }>) =>
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  // Aperçus des 6 styles de couverture générés automatiquement (titre en vue)
  useEffect(() => {
    if (!creating) return;
    for (const s of COVER_STYLES) {
      const c = styleCanvasRefs.current[s.id];
      if (c) drawAlbumCover(c, title.trim() || "Nouvel album", artistLabel, 400, s.id);
    }
  }, [creating, cover, title, artistLabel]);


  const create = async (e: FormEvent) => {
    e.preventDefault();
    const owner = isAdmin ? artistId : currentUserId;
    if (!owner) return toast.error("Choisis un artiste");
    if (!title.trim()) return toast.error("Titre requis");
    const filled = slots
      .map((s, i) => ({ ...s, i }))
      .filter((s): s is { file: File; title: string; i: number } => s.file !== null);
    if (filled.length < MIN_ALBUM_TRACKS) return toast.error(`Un album doit contenir au moins ${MIN_ALBUM_TRACKS} morceaux`);
    if (filled.length > MAX_ALBUM_TRACKS) return toast.error(`Un album ne peut pas dépasser ${MAX_ALBUM_TRACKS} morceaux`);
    setBusy(true);
    try {
      let coverPath: string | null = null;
      const coverFile = cover ?? (await generateAlbumCoverFile(title.trim(), artistLabel, autoSeed));
      if (coverFile) {
        const ext = coverFile.name.split(".").pop() ?? "jpg";
        coverPath = `${owner}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("track-covers")
          .upload(coverPath, coverFile, { contentType: coverFile.type });
        if (error) throw error;
      }

      const { data: created, error } = await supabase
        .from("albums")
        .insert({
          user_id: owner,
          title: title.trim(),
          description: description.trim() || null,
          cover_path: coverPath,
          price_ar: Math.max(500, Math.round(priceAr)),
          is_published: true,
        })
        .select("id")
        .single();
      if (error) throw error;

      setSlotStatus({});
      await uploadAlbumTracks(
        filled.map((s) => ({ file: s.file, title: s.title })),
        owner,
        created.id,
        (index, status) => setSlotStatus((prev) => ({ ...prev, [filled[index].i]: status })),
      );

      toast.success(`Album créé avec ${filled.length} morceaux`);
      setTitle("");
      setDescription("");
      setPriceAr(5000);
      setCover(null);
      setSlots(Array.from({ length: MAX_ALBUM_TRACKS }, () => ({ file: null, title: "" })));
      setSlotStatus({});
      setCreating(false);
      await onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };


  const togglePublish = async (a: AlbumRow) => {
    setBusyId(a.id);
    const { error } = await supabase.from("albums").update({ is_published: !a.is_published }).eq("id", a.id);
    if (error) toast.error(error.message);
    else await onChanged();
    setBusyId(null);
  };

  const remove = async (a: AlbumRow) => {
    if (!confirm(`Supprimer l'album « ${a.title} » ?`)) return;
    setBusyId(a.id);
    try {
      // Detach tracks
      await supabase.from("tracks").update({ album_id: null }).eq("album_id", a.id);
      if (a.cover_path) await supabase.storage.from("track-covers").remove([a.cover_path]);
      const { error } = await supabase.from("albums").delete().eq("id", a.id);
      if (error) throw error;
      toast.success("Album supprimé");
      await onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const setAlbumForTrack = async (trackId: string, albumId: string | null) => {
    setBusyId(trackId);
    const { error } = await supabase.from("tracks").update({ album_id: albumId }).eq("id", trackId);
    if (error) toast.error(error.message);
    else await onChanged();
    setBusyId(null);
  };

  const changePreview = async (a: AlbumRow, file: File) => {
    setBusyId(a.id);
    try {
      const { path, duration } = await uploadPreview(file, a.user_id);
      const { error } = await supabase
        .from("albums")
        .update({ preview_path: path, preview_duration_seconds: duration } as never)
        .eq("id", a.id);
      if (error) throw error;
      if (a.preview_path) await supabase.storage.from(PREVIEW_BUCKET).remove([a.preview_path]);
      toast.success(`Extrait ajouté (${formatSeconds(duration)})`);
      await onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const removePreview = async (a: AlbumRow) => {
    setBusyId(a.id);
    try {
      const { error } = await supabase
        .from("albums")
        .update({ preview_path: null, preview_duration_seconds: null } as never)
        .eq("id", a.id);
      if (error) throw error;
      if (a.preview_path) await supabase.storage.from(PREVIEW_BUCKET).remove([a.preview_path]);
      await onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };


  const relevantTracks = isAdmin
    ? tracks
    : tracks.filter((t) => t.user_id === currentUserId);

  return (
    <section className="mb-6 rounded-xl border border-border/50 bg-gradient-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Disc3 className="h-4 w-4 text-primary-glow" /> Albums ({visibleAlbums.length})
        </h2>
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1.5 text-[11px] font-bold shadow-glow"
        >
          <Plus className="h-3 w-3" /> {creating ? "Fermer" : "Nouveau"}
        </button>
      </div>

      {creating && (
        <form onSubmit={create} className="mb-4 space-y-2 rounded-lg border border-border/40 bg-surface p-3">
          {isAdmin && (
            <select
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
              required
            >
              <option value="">— Artiste —</option>
              {(artists ?? []).map((a) => (
                <option key={a.user_id} value={a.user_id}>{a.display_name}</option>
              ))}
            </select>
          )}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de l'album"
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optionnel)"
            rows={2}
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={500}
              step={500}
              value={priceAr}
              onChange={(e) => setPriceAr(Number(e.target.value) || 5000)}
              className="w-32 rounded-lg border border-border bg-input px-3 py-2 text-sm"
            />
            <span className="self-center text-xs text-muted-foreground">
              Ar · artiste : {Math.floor(priceAr * 0.85).toLocaleString()} Ar
            </span>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-[11px] file:font-bold file:text-primary-foreground"
          />
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="flex items-center gap-1 text-[11px] font-semibold">
                <Wand2 className="h-3 w-3 text-primary-glow" /> Couverture automatique
              </p>
              <span className="text-[10px] text-muted-foreground">
                {cover ? "Image perso. utilisée" : `Style : ${COVER_STYLES.find((s) => s.id === coverStyle)?.label}`}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {COVER_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setCoverStyle(s.id);
                    setCover(null);
                  }}
                  className={`overflow-hidden rounded-lg border text-left transition ${
                    !cover && coverStyle === s.id
                      ? "border-primary ring-2 ring-primary/50"
                      : "border-border/60 opacity-80 hover:opacity-100"
                  }`}
                >
                  <canvas
                    ref={(el) => {
                      styleCanvasRefs.current[s.id] = el;
                    }}
                    className="block aspect-square w-full"
                  />
                  <span className="block px-1 py-0.5 text-center text-[9px] font-semibold">{s.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {cover
                ? "Retire l'image personnalisée en choisissant un style ci-dessus."
                : "Le titre de l'album est intégré à l'image."}
            </p>
          </div>


          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] font-semibold">
                Morceaux ({MIN_ALBUM_TRACKS} à {MAX_ALBUM_TRACKS}) — 1 par 1
              </label>
              <span
                className={`text-[10px] font-bold ${
                  filledCount < MIN_ALBUM_TRACKS ? "text-destructive" : "text-primary"
                }`}
              >
                {filledCount}/{MAX_ALBUM_TRACKS}
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              {slots.map((slot, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 border-b border-border/60 bg-card/40 px-2 py-1.5 last:border-b-0"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      slot.file ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {slot.file ? (
                      <input
                        value={slot.title}
                        onChange={(e) => updateSlot(i, { title: e.target.value })}
                        placeholder="Titre du morceau"
                        className="w-full rounded border border-border bg-input px-2 py-1 text-[11px]"
                      />
                    ) : (
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          if (f) updateSlot(i, { file: f, title: f.name.replace(/\.[a-zA-Z0-9]+$/, "") });
                        }}
                        className="w-full text-[10px] file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-[10px] file:font-bold file:text-primary-foreground"
                      />
                    )}
                    {slot.file && (
                      <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
                        🎵 {slot.file.name}
                        {slotStatus[i] === "uploading" && " • envoi…"}
                        {slotStatus[i] === "done" && " • ✅"}
                      </p>
                    )}
                  </div>
                  {slot.file && (
                    <button
                      type="button"
                      onClick={() => updateSlot(i, { file: null, title: "" })}
                      className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                      aria-label={`Retirer le morceau ${i + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {filledCount < MIN_ALBUM_TRACKS && (
              <p className="mt-1 text-[10px] text-destructive">
                Encore {MIN_ALBUM_TRACKS - filledCount} morceau(x) requis
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-2 text-xs font-bold shadow-glow disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Créer l'album
          </button>
        </form>
      )}

      {visibleAlbums.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun album pour l'instant.</p>
      ) : (
        <ul className="space-y-2">
          {visibleAlbums.map((a) => {
            const albumTracks = relevantTracks.filter((t: any) => t.album_id === a.id);
            const otherTracks = relevantTracks.filter((t: any) => !t.album_id || t.album_id === a.id);
            return (
              <li key={a.id} className="rounded-lg border border-border/40 bg-surface p-2">
                <div className="flex items-center gap-3">
                  {a.coverUrl ? (
                    <img src={a.coverUrl} alt="" className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-black/40">
                      <Disc3 className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{a.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {isAdmin && <>{a.artistName} · </>}
                      {a.price_ar.toLocaleString()} Ar · {albumTracks.length} morceaux
                    </p>
                  </div>
                  <button
                    onClick={() => togglePublish(a)}
                    disabled={busyId === a.id}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-white/5"
                    title={a.is_published ? "Dépublier" : "Publier"}
                  >
                    {a.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => remove(a)}
                    disabled={busyId === a.id}
                    className="rounded-full p-1.5 text-destructive hover:bg-destructive/10"
                  >
                    {busyId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>

                <div className="mt-2 space-y-1.5">
                  {a.preview_path ? (
                    <PreviewPlayer
                      url={supabase.storage.from(PREVIEW_BUCKET).getPublicUrl(a.preview_path).data.publicUrl}
                      duration={a.preview_duration_seconds}
                      label={`Extrait · ${formatSeconds(a.preview_duration_seconds ?? null)}`}
                    />
                  ) : (
                    <p className="text-[10px] text-muted-foreground">Aucun extrait (max 1 min 20).</p>
                  )}
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <label className="flex flex-1 cursor-pointer items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-white/5">
                        <Music4 className="h-3 w-3" />
                        {a.preview_path ? "Remplacer l'extrait" : "Uploader un extrait"}
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          disabled={busyId === a.id}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) void changePreview(a, f);
                          }}
                        />
                      </label>
                      {a.preview_path && (
                        <button
                          onClick={() => removePreview(a)}
                          disabled={busyId === a.id}
                          className="rounded-full px-2 py-1 text-[10px] font-semibold text-destructive hover:bg-destructive/10"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-muted-foreground">Gérer les morceaux</summary>
                  <ul className="mt-1 space-y-1">
                    {otherTracks.length === 0 ? (
                      <li className="text-[11px] text-muted-foreground">Aucun morceau disponible.</li>
                    ) : (
                      otherTracks.map((t: any) => (
                        <li key={t.id} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="truncate">{t.title}</span>
                          <button
                            onClick={() => setAlbumForTrack(t.id, t.album_id === a.id ? null : a.id)}
                            disabled={busyId === t.id}
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              t.album_id === a.id
                                ? "bg-gradient-primary text-primary-foreground"
                                : "border border-border text-muted-foreground"
                            }`}
                          >
                            {t.album_id === a.id ? "Retirer" : "Ajouter"}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
