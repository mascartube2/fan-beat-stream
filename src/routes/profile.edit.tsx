import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, Camera, Loader2, Save } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { uploadProfileAvatar } from "@/lib/avatar";
import { publicUrl } from "@/lib/tracks";
import { COUNTRIES } from "@/lib/countries";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/edit")({
  component: EditProfilePage,
  head: () => ({ meta: [{ title: "Edit profile — Pulse" }] }),
});

function EditProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState<string>("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, bio, country")
      .eq("user_id", userId)
      .maybeSingle();

    setDisplayName(data?.display_name ?? "");
    setBio(data?.bio ?? "");
    setCountry((data as { country: string | null } | null)?.country ?? "");
    setAvatarPath(data?.avatar_url ?? null);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadProfile(user.id);

    const onAvatarUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; avatarUrl: string }>).detail;
      if (detail?.userId === user.id) setAvatarPath(detail.avatarUrl);
    };

    window.addEventListener("profile:avatar-updated", onAvatarUpdated);
    return () => window.removeEventListener("profile:avatar-updated", onAvatarUpdated);
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-5 pt-12 text-center">
        <p className="mb-4 text-sm text-muted-foreground">Sign in to edit your profile.</p>
        <Link to="/auth" className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold shadow-glow">
          Sign in
        </Link>
      </div>
    );
  }

  const handlePickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const avatarUrl = await uploadProfileAvatar(user.id, file);
      setAvatarPath(avatarUrl);
      toast.success("Photo de profil mise à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'upload");
      console.error(err);
    } finally {
      e.target.value = "";
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          country: country || null,
          avatar_url: avatarPath,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Profil mis à jour");
      navigate({ to: "/profile" });
    } catch (err) {
      toast.error("Échec de l'enregistrement");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const avatarUrl = avatarPath
    ? avatarPath.startsWith("http")
      ? avatarPath
      : publicUrl("track-covers", avatarPath)
    : null;

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/profile" })}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold">Modifier le profil</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-bold shadow-glow disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Enregistrer
        </button>
      </header>

      <div className="flex flex-col items-center px-4 pt-6">
        <div className="relative">
          <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-background bg-gradient-primary shadow-elevated">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold">
                {(displayName || user.email || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary shadow-glow transition active:scale-95 disabled:opacity-50"
            aria-label="Changer la photo de profil"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePickFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mt-3 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary-glow disabled:opacity-50"
        >
          {uploading ? "Téléchargement..." : "Changer la photo de profil"}
        </button>
      </div>

      <div className="mt-6 space-y-5 px-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Nom</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ton nom"
            maxLength={50}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Parle de toi..."
            rows={4}
            maxLength={160}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{bio.length}/160</p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Email</label>
          <input
            type="email"
            value={user.email ?? ""}
            disabled
            className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground"
          />
        </div>
      </div>
    </div>
  );
}
