import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { Loader2 } from "lucide-react";
import { LogoIcon } from "@/components/brand/Logo";
import { COUNTRIES } from "@/lib/countries";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — Pulse" }] }),
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("MG");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { session } = useAuth();

  if (session) {
    // already signed in
    setTimeout(() => navigate({ to: "/" }), 0);
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!country) {
          throw new Error("Sélectionne ton pays");
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: displayName || email.split("@")[0], country },
          },
        });
        if (error) throw error;
        // Persist country onto the auto-created profile (handle_new_user trigger only sets display_name).
        const newUserId = data.user?.id;
        if (newUserId) {
          await supabase.from("profiles").update({ country }).eq("user_id", newUserId);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err: any) {
      setError(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-5 pt-12">
      <div className="mx-auto max-w-sm">
        <div className="mb-4 flex justify-center">
          <LogoIcon className="h-20 w-20 drop-shadow-[0_0_30px_rgba(139,92,246,0.5)]" />
        </div>
        <h1 className="mb-1 text-center text-3xl font-bold">
          <span className="text-gradient">Mascartube</span>
        </h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </p>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            placeholder="Password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />

          {error && (
            <p className="rounded-lg bg-destructive/15 px-3 py-2 text-xs text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-3 text-sm font-bold shadow-glow disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
          className="mt-5 w-full text-center text-xs text-muted-foreground"
        >
          {mode === "signin" ? "No account yet? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
