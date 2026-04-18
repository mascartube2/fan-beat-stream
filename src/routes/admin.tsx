import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { Loader2, Check, X, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — Pulse" }] }),
});

type Request = {
  id: string;
  user_id: string;
  bio: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  display_name?: string;
};

function AdminPage() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: reqs } = await supabase
      .from("artist_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (!reqs) {
      setRequests([]);
      setLoading(false);
      return;
    }
    const ids = [...new Set(reqs.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", ids);
    const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name ?? "Unknown"]));
    setRequests(reqs.map((r) => ({ ...r, display_name: nameMap.get(r.user_id) })) as Request[]);
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
        <Link to="/auth" className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold">
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

  const pending = requests.filter((r) => r.status === "pending");
  const reviewed = requests.filter((r) => r.status !== "pending");

  return (
    <div className="px-5 pt-6 pb-12">
      <div className="mb-5 flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary-glow" />
        <h1 className="text-2xl font-bold">Admin</h1>
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
        Pending requests ({pending.length})
      </h2>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending requests.</p>
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
                  <Check className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  onClick={() => review(r.id, "rejected")}
                  disabled={busyId === r.id}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border py-2 text-xs font-bold disabled:opacity-60"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-xs font-semibold uppercase text-muted-foreground">History</h2>
          <div className="space-y-2">
            {reviewed.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-xs"
              >
                <span>{r.display_name}</span>
                <span
                  className={
                    r.status === "approved" ? "text-primary-glow" : "text-destructive"
                  }
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
