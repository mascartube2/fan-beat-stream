import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Film, Eye, Heart, Archive, ArchiveRestore, Trash2, ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchShorts, SHORTS_PUBLIC_DAYS, type ShortWithAuthor } from "@/lib/shorts";
import { toast } from "sonner";
import { AlbumManager, type AlbumRow } from "@/components/album/AlbumManager";
import { fetchTracksWithArtists, type TrackWithArtist } from "@/lib/tracks";

export const Route = createFileRoute("/artist-dashboard")({
  component: ArtistDashboardPage,
  head: () => ({ meta: [{ title: "Tableau de bord artiste — Mascartube" }] }),
});

function ArtistDashboardPage() {
  const { user, isArtist, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState<ShortWithAuthor[]>([]);
  const [archived, setArchived] = useState<ShortWithAuthor[]>([]);
  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  const [myTracks, setMyTracks] = useState<TrackWithArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "archived">("active");

  const load = async (uid: string) => {
    setLoading(true);
    const [feed, arch, { data: albumRows }, allTracks] = await Promise.all([
      fetchShorts({ scope: "feed", userId: uid, limit: 200 }),
      fetchShorts({ scope: "archive", userId: uid, limit: 200 }),
      supabase.from("albums").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      fetchTracksWithArtists(500),
    ]);
    setActive(feed);
    setArchived(arch);
    setAlbums(((albumRows ?? []) as AlbumRow[]).map((a) => ({
      ...a,
      coverUrl: a.cover_path ? supabase.storage.from("track-covers").getPublicUrl(a.cover_path).data.publicUrl : null,
    })));
    setMyTracks(allTracks.filter((t) => t.user_id === uid));
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    void load(user.id);
    const ch = supabase
      .channel("artist-dashboard-shorts")
      .on("postgres_changes", { event: "*", schema: "public", table: "shorts", filter: `user_id=eq.${user.id}` }, () => {
        void load(user.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!user) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="mb-3 text-sm text-muted-foreground">Connecte-toi pour accéder au tableau de bord artiste.</p>
        <Link to="/auth" className="inline-block rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold">Se connecter</Link>
      </div>
    );
  }
  if (!isArtist && !isAdmin) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="mb-3 text-sm text-muted-foreground">Cette section est réservée aux artistes certifiés.</p>
        <Link to="/become-artist" className="inline-block rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold">Devenir artiste</Link>
      </div>
    );
  }

  const allShorts = [...active, ...archived];
  const totalViews = allShorts.reduce((s, x) => s + (x.views_count || 0), 0);
  const totalLikes = allShorts.reduce((s, x) => s + (x.likes_count || 0), 0);

  const archiveShort = async (s: ShortWithAuthor) => {
    setBusyId(s.id);
    try {
      const oldDate = new Date(Date.now() - (SHORTS_PUBLIC_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("shorts").update({ created_at: oldDate }).eq("id", s.id);
      if (error) throw error;
      toast.success("Réel archivé");
      void load(user.id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const restoreShort = async (s: ShortWithAuthor) => {
    setBusyId(s.id);
    try {
      const { error } = await supabase.from("shorts").update({ created_at: new Date().toISOString() }).eq("id", s.id);
      if (error) throw error;
      toast.success("Réel republié");
      void load(user.id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const deleteShort = async (s: ShortWithAuthor) => {
    if (!confirm("Supprimer définitivement ce réel ?")) return;
    setBusyId(s.id);
    try {
      await supabase.storage.from("shorts").remove([s.video_path]);
      if (s.thumbnail_path) await supabase.storage.from("shorts").remove([s.thumbnail_path]);
      const { error } = await supabase.from("shorts").delete().eq("id", s.id);
      if (error) throw error;
      toast.success("Réel supprimé");
      void load(user.id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const list = tab === "active" ? active : archived;

  return (
    <div className="px-4 pt-4 pb-24">
      <header className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate({ to: "/profile" })} className="rounded-full p-1.5 hover:bg-white/5" aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Tableau de bord artiste</h1>
      </header>

      <section className="mb-5 grid grid-cols-2 gap-2">
        <StatCard icon={<Film className="h-4 w-4" />} label="Actifs" value={active.length} accent />
        <StatCard icon={<Archive className="h-4 w-4" />} label="Archivés" value={archived.length} />
        <StatCard icon={<Eye className="h-4 w-4" />} label="Vues totales" value={totalViews} />
        <StatCard icon={<Heart className="h-4 w-4" />} label="Likes totaux" value={totalLikes} />
      </section>

      <AlbumManager
        albums={albums}
        tracks={myTracks}
        onChanged={() => user && load(user.id)}
        currentUserId={user.id}
      />


      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex rounded-full border border-border/50 bg-surface p-1 text-xs">
          <button
            onClick={() => setTab("active")}
            className={`rounded-full px-3 py-1.5 font-semibold transition ${tab === "active" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"}`}
          >
            Actifs ({active.length})
          </button>
          <button
            onClick={() => setTab("archived")}
            className={`rounded-full px-3 py-1.5 font-semibold transition ${tab === "archived" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"}`}
          >
            Archivés ({archived.length})
          </button>
        </div>
        <Link to="/shorts" className="flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-bold shadow-glow">
          <Plus className="h-3.5 w-3.5" /> Publier
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : list.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {tab === "active" ? "Aucun réel actif. Publie ton premier réel !" : "Aucun réel archivé."}
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-xl border border-border/40 bg-surface p-2">
              <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-black">
                {s.thumbnailUrl ? (
                  <img src={s.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><Film className="h-4 w-4 text-muted-foreground" /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{s.caption || "Sans légende"}</p>
                <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5"><Eye className="h-3 w-3" />{s.views_count}</span>
                  <span className="inline-flex items-center gap-0.5"><Heart className="h-3 w-3" />{s.likes_count}</span>
                  <span>· {new Date(s.created_at).toLocaleDateString()}</span>
                </p>
              </div>
              <div className="flex items-center gap-1">
                {tab === "active" ? (
                  <button
                    onClick={() => archiveShort(s)}
                    disabled={busyId === s.id}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-white/5 disabled:opacity-50"
                    aria-label="Archiver"
                    title="Archiver"
                  >
                    {busyId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                  </button>
                ) : (
                  <button
                    onClick={() => restoreShort(s)}
                    disabled={busyId === s.id}
                    className="rounded-full p-1.5 text-primary-glow hover:bg-white/5 disabled:opacity-50"
                    aria-label="Republier"
                    title="Republier"
                  >
                    {busyId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
                  </button>
                )}
                <button
                  onClick={() => deleteShort(s)}
                  disabled={busyId === s.id}
                  className="rounded-full p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  aria-label="Supprimer"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border border-border/40 p-3 ${accent ? "bg-gradient-primary/10" : "bg-surface"}`}>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon} <span>{label}</span>
      </div>
      <p className="text-xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}
