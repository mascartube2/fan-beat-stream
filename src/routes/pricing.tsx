import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Music, Disc3, Wallet, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Tarifs & vente directe — Mascartube" },
      { name: "description", content: "Vente directe de morceaux et albums à Madagascar. 500 Ar le single, 5 000 Ar l'album. L'artiste garde 85 %." },
      { property: "og:title", content: "Tarifs & vente directe — Mascartube" },
      { property: "og:description", content: "Achète des morceaux et albums d'artistes malgaches. 85 % pour l'artiste, 15 % pour la plateforme." },
    ],
  }),
});

function PricingPage() {
  return (
    <div className="px-4 pt-3 pb-24">
      <Link to="/" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <header className="mb-5">
        <h1 className="text-2xl font-bold">Vente directe 🎶</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Soutiens directement les artistes malgaches. Paiement Mobile Money, l'artiste garde <span className="font-bold text-foreground">85 %</span>.
        </p>
      </header>

      <section className="mb-5 grid gap-3 sm:grid-cols-2">
        <PriceCard
          icon={<Music className="h-5 w-5" />}
          label="Single exclusif"
          price="500 Ar"
          artist="425 Ar"
          platform="75 Ar"
        />
        <PriceCard
          icon={<Disc3 className="h-5 w-5" />}
          label="Album complet"
          price="5 000 Ar"
          artist="4 250 Ar"
          platform="750 Ar"
        />
      </section>

      <section className="mb-5 rounded-2xl border border-border/50 bg-gradient-card p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
          <Wallet className="h-4 w-4 text-primary-glow" /> Répartition des gains
        </h2>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-glow" />
            <span><span className="font-bold text-foreground">85 %</span> reversés à l'artiste sur chaque vente.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-glow" />
            <span><span className="font-bold text-foreground">15 %</span> conservés par Mascartube pour les frais de fonctionnement.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-glow" />
            <span>Paiements acceptés : <span className="font-semibold text-foreground">Mvola, Airtel Money, Orange Money</span>.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-glow" />
            <span>Validation manuelle par un admin après réception du paiement.</span>
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">Numéros de paiement</p>
        <p className="mt-1">Les numéros Mvola / Airtel / Orange officiels seront affichés ici par l'administrateur.</p>
      </section>
    </div>
  );
}

function PriceCard({
  icon,
  label,
  price,
  artist,
  platform,
}: {
  icon: React.ReactNode;
  label: string;
  price: string;
  artist: string;
  platform: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-surface p-4 shadow-soft">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        {icon} {label}
      </div>
      <p className="text-2xl font-bold">{price}</p>
      <div className="mt-3 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">🎤 Artiste (85 %)</span>
          <span className="font-bold text-primary-glow">{artist}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">💠 Plateforme (15 %)</span>
          <span className="font-semibold">{platform}</span>
        </div>
      </div>
    </div>
  );
}
