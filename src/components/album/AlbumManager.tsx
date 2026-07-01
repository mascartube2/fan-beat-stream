import { useState, type FormEvent } from "react";
import { Loader2, Disc3, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TrackWithArtist } from "@/lib/tracks";

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
  const [artistId, setArtistId] = useState<string>(currentUserId ?? "");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visibleAlbums = isAdmin ? albums : albums.filter((a) => a.user_id === currentUserId);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const owner = isAdmin ? artistId : currentUserId;
    if (!owner) return toast.error("Choisis un artiste");
    if (!title.trim()) return toast.error("Titre requis");
    setBusy(true);
    try {
      let coverPath: string | null = null;
      if (cover) {
        const ext = cover.name.split(".").pop() ?? "jpg";
        coverPath = `${owner}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("track-covers").upload(coverPath, cover, { contentType: cover.type });
        if (error) throw error;
      }
      const { error } = await supabase.from("albums").insert({
        user_id: owner,
        title: title.trim(),
        description: description.trim() || null,
        cover_path: coverPath,
        price_ar: Math.max(500, Math.round(priceAr)),
        is_published: true,
      });
      if (error) throw error;
      toast.success("Album créé");
      setTitle("");
      setDescription("");
      setPriceAr(5000);
      setCover(null);
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
