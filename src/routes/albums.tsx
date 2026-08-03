import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Disc3, Loader2, ShoppingBag, Music2, Download, CheckCircle2, Gift } from "lucide-react";
import { fetchAlbumsForSale, fetchFreeAlbums, fetchPurchasedAlbumIds, fetchAlbumTracks, type AlbumForSale, type AlbumTrackFile } from "@/lib/albums";
import { downloadTrack } from "@/lib/tracks";
import { useAuth } from "@/components/auth/AuthContext";
import { PreviewPlayer } from "@/components/album/PreviewPlayer";
import { BuyDialog } from "@/components/purchase/BuyDialog";


export const Route = createFileRoute("/albums")({
  component: AlbumsPage,
  head: () => ({
    meta: [
      { title: "Albums en vente — Mascartube" },
      { name: "description", content: "Découvre les albums d'artistes malgaches en vente sur Mascartube, écoute un extrait gratuit de 1 min 20 avant d'acheter." },
      { property: "og:title", content: "Albums en vente — Mascartube" },
      { property: "og:description", content: "Extraits gratuits et achat direct par Mobile Money. 85 % pour l'artiste." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function AlbumsPage() {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<AlbumForSale[]>([]);
  const [freeAlbums, setFreeAlbums] = useState<AlbumForSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<AlbumForSale | null>(null);
  const [ownedIds, setOwnedIds] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([fetchAlbumsForSale(), fetchFreeAlbums()]).then(([paid, free]) => {
      setAlbums(paid);
      setFreeAlbums(free);
      setLoading(false);
    });
  }, []);

  const loadOwned = () => {
    if (!user) return setOwnedIds([]);
    fetchPurchasedAlbumIds(user.id).then(setOwnedIds);
  };
  useEffect(loadOwned, [user?.id]);


  const totalTracks = albums.reduce((s, a) => s + a.trackCount, 0);


  return (
    <div className="px-4 pt-3 pb-24">
      <Link to="/" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <header className="mb-4">
        <h1 className="text-2xl font-bold">Albums en vente 💿</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Écoute un extrait gratuit (1 min 20 max) avant d'acheter. L'artiste garde 85 %.
        </p>
      </header>

      <section className="mb-5 grid grid-cols-3 gap-2">
        <Stat label="Albums" value={albums.length} icon={<Disc3 className="h-4 w-4" />} accent />
        <Stat label="Morceaux" value={totalTracks} icon={<Music2 className="h-4 w-4" />} />
        <Stat label="Avec extrait" value={albums.filter((a) => a.previewUrl).length} icon={<ShoppingBag className="h-4 w-4" />} />
      </section>

      {freeAlbums.length > 0 && (
        <section className="mb-6 rounded-2xl border border-primary/40 bg-primary/5 p-3">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-primary-glow">
            <Gift className="h-4 w-4" /> Albums gratuits ({freeAlbums.length})
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Offerts par les artistes — téléchargement libre, disponibles pour toujours.
          </p>
          <ul className="space-y-3">
            {freeAlbums.map((a) => (
              <li key={a.id} className="rounded-xl border border-border/50 bg-gradient-card p-3">
                <div className="flex gap-3">
                  <img src={a.coverUrl} alt={`Pochette de ${a.title}`} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{a.title}</p>
                    <Link to="/u/$userId" params={{ userId: a.user_id }} className="text-xs text-muted-foreground hover:underline">
                      {a.artistName}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {a.trackCount} morceaux · <span className="font-bold text-primary-glow">Gratuit</span>
                    </p>
                    {a.description && <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{a.description}</p>}
                  </div>
                </div>
                {a.previewUrl && (
                  <div className="mt-2">
                    <PreviewPlayer url={a.previewUrl} duration={a.preview_duration_seconds} label="Extrait" />
                  </div>
                )}
                <AlbumDownloads albumId={a.id} title={a.title} free />
              </li>
            ))}
          </ul>
        </section>
      )}



      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : albums.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Aucun album en vente pour l'instant.</p>
      ) : (
        <ul className="space-y-3">
          {albums.map((a) => (
            <li key={a.id} className="rounded-2xl border border-border/50 bg-gradient-card p-3">
              <div className="flex gap-3">
                <img src={a.coverUrl} alt={`Pochette de ${a.title}`} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{a.title}</p>
                  <Link to="/u/$userId" params={{ userId: a.user_id }} className="text-xs text-muted-foreground hover:underline">
                    {a.artistName}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {a.trackCount} morceaux · <span className="font-bold text-primary-glow">{a.price_ar.toLocaleString()} Ar</span>
                  </p>
                  {a.description && <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{a.description}</p>}
                </div>
              </div>

              <div className="mt-2">
                {a.previewUrl ? (
                  <PreviewPlayer url={a.previewUrl} duration={a.preview_duration_seconds} label="Extrait gratuit" />
                ) : (
                  <p className="rounded-full border border-dashed border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground">
                    Extrait bientôt disponible
                  </p>
                )}
              </div>

              {ownedIds.includes(a.id) ? (
                <AlbumDownloads albumId={a.id} title={a.title} />
              ) : (
                <button
                  onClick={() => setBuying(a)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-2 text-xs font-bold shadow-glow"
                >
                  <ShoppingBag className="h-4 w-4" /> Acheter · {a.price_ar.toLocaleString()} Ar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {buying && (
        <BuyDialog
          itemType="album"
          itemId={buying.id}
          priceAr={buying.price_ar}
          title={buying.title}
          onClose={() => setBuying(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-xl border border-border/40 p-2.5 ${accent ? "bg-gradient-primary/10" : "bg-surface"}`}>
      <div className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">{icon}<span>{label}</span></div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function AlbumDownloads({ albumId, title, free }: { albumId: string; title: string; free?: boolean }) {
  const [tracks, setTracks] = useState<AlbumTrackFile[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchAlbumTracks(albumId).then(setTracks);
  }, [albumId]);

  const downloadAll = async () => {
    setBusy(true);
    for (const t of tracks) {
      await downloadTrack({ title: t.title, audioUrl: t.audioUrl, audio_path: t.audio_path });
    }
    setBusy(false);
  };

  return (
    <div className="mt-2 rounded-xl border border-primary/40 bg-primary/5 p-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-bold text-primary-glow">
        <CheckCircle2 className="h-3.5 w-3.5" /> {free ? "Album gratuit — téléchargement libre" : "Achat validé — album débloqué"}
      </p>

      <div className="mt-2 flex gap-2">
        <button
          onClick={downloadAll}
          disabled={busy || tracks.length === 0}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-primary py-2 text-xs font-bold shadow-glow disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Télécharger l'album ({tracks.length})
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-border/60 px-3 py-2 text-[11px] font-semibold text-muted-foreground"
        >
          {open ? "Masquer" : "Titres"}
        </button>
      </div>
      {open && (
        <ul className="mt-2 space-y-1">
          {tracks.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate">{t.title}</span>
              <button
                onClick={() => downloadTrack({ title: t.title, audioUrl: t.audioUrl, audio_path: t.audio_path })}
                className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold"
                aria-label={`Télécharger ${t.title} de ${title}`}
              >
                <Download className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
