import { createFileRoute, Link } from "@tanstack/react-router";
import { Gauge, ImageOff, Music2, Signal, Video, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useDataSaver } from "@/components/data/DataSaverContext";
import { formatBytes, getNetworkInfo } from "@/lib/data-saver";

const SITE = "https://fan-beat-stream.lovable.app";

export const Route = createFileRoute("/data-saver")({
  component: DataSaverPage,
  head: () => ({
    meta: [
      { title: "Mode data-light — économiser vos données | Mascartube" },
      {
        name: "description",
        content:
          "Activez le mode data-light de Mascartube : streaming en basse qualité, images allégées et compteur d'économie de données pour les connexions 3G à Madagascar.",
      },
      { property: "og:title", content: "Mode data-light — économiser vos données | Mascartube" },
      {
        property: "og:description",
        content: "Écoutez la musique malgache en consommant moins de données mobiles, même en 3G.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE}/data-saver` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE}/data-saver` }],
  }),
});

function DataSaverPage() {
  const { enabled, setEnabled, savedBytes, resetSavings, slowNetwork } = useDataSaver();
  const [netLabel, setNetLabel] = useState<string | null>(null);

  useEffect(() => {
    const info = getNetworkInfo();
    if (!info) return;
    const parts = [info.effectiveType?.toUpperCase(), info.downlink ? `${info.downlink} Mb/s` : null].filter(Boolean);
    setNetLabel(parts.join(" · ") || null);
  }, []);

  return (
    <div className="px-4 pt-4 pb-32">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Gauge className="h-5 w-5 text-primary-glow" /> Mode data-light
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Pensé pour les connexions mobiles malgaches : moins d'images, moins de vidéo automatique, écoute allégée.
      </p>

      <div className="bg-gradient-card mt-4 flex items-center justify-between rounded-2xl border border-border/50 p-4">
        <div>
          <p className="text-sm font-bold">Économiser mes données</p>
          <p className="text-[11px] text-muted-foreground">
            {enabled ? "Activé — lecture et images allégées" : "Désactivé — qualité maximale"}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Activer le mode data-light" />
      </div>

      <div className="mt-3 rounded-2xl border border-border/50 bg-surface p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Données économisées</p>
        <p className="mt-1 text-3xl font-black text-primary-glow">{formatBytes(savedBytes)}</p>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Signal className="h-3.5 w-3.5" />
          {netLabel ? `Réseau détecté : ${netLabel}` : "Réseau non détecté"}
          {slowNetwork && <span className="font-semibold text-primary-glow">· 3G ou moins</span>}
        </div>
        {savedBytes > 0 && (
          <button onClick={resetSavings} className="mt-3 text-[11px] font-semibold text-muted-foreground underline">
            Remettre le compteur à zéro
          </button>
        )}
      </div>

      <h2 className="mt-5 text-sm font-semibold text-muted-foreground">Ce que fait le mode data-light</h2>
      <ul className="mt-2 space-y-2">
        <Item icon={<Music2 className="h-4 w-4" />} title="Streaming basse qualité">
          L'audio n'est plus préchargé : il se charge seulement pendant l'écoute, morceau par morceau.
        </Item>
        <Item icon={<Video className="h-4 w-4" />} title="Réels sans lecture automatique">
          Les vidéos attendent votre tap au lieu de se lancer toutes seules.
        </Item>
        <Item icon={<ImageOff className="h-4 w-4" />} title="Pochettes allégées">
          Les images ne sont pas téléchargées ; touchez « Afficher » pour voir une pochette.
        </Item>
        <Item icon={<Wifi className="h-4 w-4" />} title="Pages adaptées à la 3G">
          Les listes se chargent en version courte pour s'afficher vite même avec un réseau faible.
        </Item>
      </ul>

      <p className="mt-5 text-[11px] text-muted-foreground">
        Astuce : pour écouter sans aucune donnée, sauvegardez vos titres depuis{" "}
        <Link to="/downloads" className="font-semibold text-primary-glow">
          Mes téléchargements
        </Link>
        .
      </p>
    </div>
  );
}

function Item({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-xl border border-border/40 bg-surface p-3">
      <span className="mt-0.5 text-primary-glow">{icon}</span>
      <span>
        <span className="block text-xs font-bold">{title}</span>
        <span className="block text-[11px] text-muted-foreground">{children}</span>
      </span>
    </li>
  );
}
