import { useEffect, useState } from "react";
import logoIcon from "@/assets/logo-icon.png";

const SPLASH_KEY = "mascartube_splash_shown";

export function SplashScreen() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(SPLASH_KEY);
  });

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem(SPLASH_KEY, "1");
    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background animate-in fade-in"
      style={{ animation: "splash-fade 5s ease-out forwards" }}
    >
      <style>{`
        @keyframes splash-fade {
          0% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes splash-pop {
          0% { transform: scale(0.8); opacity: 0; }
          40% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div
        className="relative"
        style={{ animation: "splash-pop 0.9s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-primary blur-3xl opacity-40" />
        <img
          src={logoIcon}
          alt="Mascartube"
          width={160}
          height={160}
          className="relative h-40 w-40 drop-shadow-[0_0_40px_rgba(139,92,246,0.6)]"
        />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">
        <span className="text-gradient">Mascartube</span>
      </h1>
      <p className="mt-2 text-xs text-muted-foreground">Music & Community</p>
      <div className="mt-8 flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary-glow eq-bar" style={{ animationDelay: "0s" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-primary-glow eq-bar" style={{ animationDelay: "0.15s" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-primary-glow eq-bar" style={{ animationDelay: "0.3s" }} />
      </div>
    </div>
  );
}
