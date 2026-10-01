import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Music, Users, Wifi, Share2, CheckCircle2, Smartphone } from "lucide-react";
import { usePwaInstall } from "@/lib/pwa-install";
import logoSquare from "@/assets/logo-square.png";

const SITE = "https://fan-beat-stream.lovable.app";

export const Route = createFileRoute("/installer")({
  component: InstallerPage,
  head: () => ({
    meta: [
      { title: "Installer Mascartube gratuitement — L'app de musique malgache" },
      {
        name: "description",
        content:
          "Installez Mascartube gratuitement sur votre téléphone en un clic : musique malgache en streaming, réels, messages et mode hors connexion.",
      },
      { property: "og:title", content: "Installer Mascartube gratuitement" },
      {
        property: "og:description",
        content: "L'app de musique malgache : streaming gratuit, réels, messages. Installation en un clic, sans store.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE}/installer` },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${SITE}/installer` }],
  }),
});

const FEATURES = [
  { icon: Music, title: "Musique gratuite", text: "Écoutez tous les artistes malgaches en streaming illimité." },
  { icon: Wifi, title: "Mode hors connexion", text: "Téléchargez vos morceaux et écoutez-les sans internet." },
  { icon: Users, title: "Communauté", text: "Suivez vos artistes, commentez, partagez et discutez." },
  { icon: Share2, title: "Partage facile", text: "Partagez vos morceaux préférés sur Facebook et WhatsApp." },
];

function InstallerPage() {
  const { canInstall, installed, promptInstall } = usePwaInstall();

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-8">
      <div className="flex flex-col items-center text-center">
        <img
          src={logoSquare}
          alt="Mascartube"
          className="h-24 w-24 rounded-3xl shadow-glow"
        />
        <h1 className="mt-5 text-3xl font-bold text-gradient">Installer Mascartube</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          L'application de musique malgache, gratuite, directement sur votre téléphone — sans passer par un store.
        </p>

        {installed ? (
          <div className="mt-6 flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary">
            <CheckCircle2 className="h-5 w-5" />
            Mascartube est déjà installée sur cet appareil
          </div>
        ) : canInstall ? (
          <button
            onClick={() => void promptInstall()}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-8 py-3.5 text-base font-bold shadow-glow transition-transform active:scale-95"
          >
            <Download className="h-5 w-5" />
            Installer maintenant — Gratuit
          </button>
        ) : (
          <div className="mt-6 w-full rounded-2xl border border-border bg-card p-5 text-left">
            <div className="flex items-center gap-2 font-semibold">
              <Smartphone className="h-5 w-5 text-primary" />
              Comment installer
            </div>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Ouvrez le menu de votre navigateur (⋮ en haut à droite sur Chrome).</li>
              <li>
                Appuyez sur <span className="font-semibold text-foreground">« Ajouter à l'écran d'accueil »</span> ou{" "}
                <span className="font-semibold text-foreground">« Installer l'application »</span>.
              </li>
              <li>Confirmez : l'icône Mascartube apparaît sur votre écran d'accueil.</li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              Sur iPhone : ouvrez dans Safari, appuyez sur le bouton Partager puis « Sur l'écran d'accueil ».
            </p>
          </div>
        )}
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card p-4">
            <f.icon className="h-6 w-6 text-primary" />
            <div className="mt-2 text-sm font-semibold">{f.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{f.text}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link to="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Continuer dans le navigateur →
        </Link>
      </div>
    </div>
  );
}
