import { Plus, Loader2, X, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "sonner";

type StoryRow = {
  id: string;
  user_id: string;
  media_path: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
};

type StoryWithAuthor = StoryRow & {
  authorName: string;
  avatarUrl: string | null;
  mediaUrl: string;
};

function publicUrl(path: string) {
  return supabase.storage.from("stories").getPublicUrl(path).data.publicUrl;
}

export function StoriesRow() {
  const { user } = useAuth();
  const [stories, setStories] = useState<StoryWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data: rows } = await supabase
      .from("stories")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (!rows) {
      setStories([]);
      setLoading(false);
      return;
    }
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("user_id,display_name,avatar_url").in("user_id", ids)
      : { data: [] as { user_id: string; display_name: string | null; avatar_url: string | null }[] };
    const map = new Map(profs?.map((p) => [p.user_id, p]));
    setStories(
      rows.map((r) => ({
        ...r,
        authorName: map.get(r.user_id)?.display_name ?? "User",
        avatarUrl: map.get(r.user_id)?.avatar_url ?? null,
        mediaUrl: publicUrl(r.media_path),
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("stories-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const onPick = () => {
    if (!user) {
      toast.error("Connecte-toi pour publier une story");
      return;
    }
    fileRef.current?.click();
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Fichier trop lourd (max 25 Mo)");
      return;
    }
    const isVideo = file.type.startsWith("video/");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("stories").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const ins = await supabase
        .from("stories")
        .insert({ user_id: user.id, media_path: path, media_type: isVideo ? "video" : "image" });
      if (ins.error) throw ins.error;
      toast.success("Story publiée — visible 48h");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (story: StoryWithAuthor) => {
    if (!user || story.user_id !== user.id) return;
    if (!confirm("Supprimer cette story ?")) return;
    // Optimistic UI
    const prev = stories;
    setStories((s) => s.filter((x) => x.id !== story.id));
    setViewing(null);
    try {
      const { error: rmErr } = await supabase.storage.from("stories").remove([story.media_path]);
      if (rmErr) throw rmErr;
      const { error: delErr } = await supabase.from("stories").delete().eq("id", story.id);
      if (delErr) throw delErr;
      toast.success("Story supprimée");
    } catch (err) {
      setStories(prev);
      toast.error((err as Error).message);
    }
  };

  const current = viewing !== null ? stories[viewing] : null;

  return (
    <>
      <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        <button
          onClick={onPick}
          disabled={uploading}
          className="flex w-16 shrink-0 flex-col items-center gap-1.5"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border bg-surface">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Plus className="h-5 w-5 text-muted-foreground" />
            )}
          </span>
          <span className="text-[10px] text-muted-foreground">Toi</span>
        </button>

        {loading ? (
          <p className="flex items-center text-[11px] text-muted-foreground">Chargement…</p>
        ) : stories.length === 0 ? (
          <p className="flex items-center text-[11px] text-muted-foreground">
            Aucune story — sois le premier à en publier (48h).
          </p>
        ) : (
          stories.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setViewing(i)}
              className="flex w-16 shrink-0 flex-col items-center gap-1.5"
            >
              <span className="rounded-full bg-gradient-primary p-[2px]">
                <span className="block rounded-full border-2 border-background">
                  {s.avatarUrl ? (
                    <img
                      src={s.avatarUrl}
                      alt={s.authorName}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-xs font-bold">
                      {s.authorName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </span>
              </span>
              <span className="max-w-[64px] truncate text-[10px] text-muted-foreground">
                {s.authorName}
              </span>
            </button>
          ))
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        onChange={onUpload}
        className="hidden"
      />

      {current && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95"
          onClick={() => setViewing(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setViewing(null);
            }}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute left-4 right-12 top-4 z-10 flex items-center gap-2">
            {current.avatarUrl ? (
              <img src={current.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="h-8 w-8 rounded-full bg-surface" />
            )}
            <span className="text-sm font-semibold">{current.authorName}</span>
            <span className="text-xs text-white/60">
              {new Date(current.created_at).toLocaleString()}
            </span>
          </div>
          <div className="max-h-[90vh] w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            {current.media_type === "video" ? (
              <video src={current.mediaUrl} controls autoPlay className="max-h-[90vh] w-full" />
            ) : (
              <img src={current.mediaUrl} alt="" className="max-h-[90vh] w-full object-contain" />
            )}
            {current.caption && (
              <p className="mt-2 px-4 text-center text-sm">{current.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
