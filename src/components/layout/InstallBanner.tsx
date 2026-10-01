import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, X } from "lucide-react";
import { usePwaInstall } from "@/lib/pwa-install";

const DISMISS_KEY = "mascartube:install-banner-dismissed";

export function InstallBanner() {
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (installed || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="mb-3 flex items-center gap-3 rounded-2xl border border-primary/30 bg-card p-3 shadow-glow">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary">
        <Download className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">Installer Mascartube</div>
        <div className="truncate text-xs text-muted-foreground">
          Gratuit, rapide, moins de données
        </div>
      </div>
      {canInstall ? (
        <button
          onClick={() => void promptInstall()}
          className="shrink-0 rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-bold"
        >
          Installer
        </button>
      ) : (
        <Link
          to="/installer"
          className="shrink-0 rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-bold"
        >
          Installer
        </Link>
      )}
      <button
        onClick={dismiss}
        aria-label="Fermer"
        className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
