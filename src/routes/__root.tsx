import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { PlayerProvider } from "@/components/player/PlayerContext";
import { AuthProvider } from "@/components/auth/AuthContext";
import { AppShell } from "@/components/layout/AppShell";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold shadow-glow"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#141432" },
      { title: "Mascartube— Music & Community" },
      {
        name: "description",
        content: "Stream music and connect with your favorite artists. Pulse fuses streaming with social to bring fans and artists closer.",
      },
      { property: "og:title", content: "Mascartube— Music & Community" },
      { property: "og:description", content: "Fan Connect Studio is a mobile-first web app that merges music streaming with social networking for fan engagement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Mascartube— Music & Community" },
      { name: "description", content: "Fan Connect Studio is a mobile-first web app that merges music streaming with social networking for fan engagement." },
      { name: "twitter:description", content: "Fan Connect Studio is a mobile-first web app that merges music streaming with social networking for fan engagement." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/RkQMEWEKixeeCLAWkGgiQ3mBaEl1/social-images/social-1776534253216-IMG_20260328_103707.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/RkQMEWEKixeeCLAWkGgiQ3mBaEl1/social-images/social-1776534253216-IMG_20260328_103707.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </PlayerProvider>
    </AuthProvider>
  );
}
