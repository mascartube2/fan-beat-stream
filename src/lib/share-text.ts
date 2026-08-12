export type ShareKind = "track" | "challenge" | "post" | "profile" | "album" | "short" | "generic";

/** Devine le type de contenu à partir du lien profond. */
export function detectShareKind(url: string): ShareKind {
  const path = url.replace(/^https?:\/\/[^/]+/, "");
  if (path.startsWith("/track/")) return "track";
  if (path.startsWith("/challenge")) return "challenge";
  if (path.startsWith("/post/")) return "post";
  if (path.startsWith("/u/")) return "profile";
  if (path.startsWith("/albums")) return "album";
  if (path.startsWith("/shorts")) return "short";
  return "generic";
}

const BASE_TAGS = ["#Mascartube", "#MusiqueMalgache", "#Madagascar"];

const KIND_TAGS: Record<ShareKind, string[]> = {
  track: ["#NouveauSon", "#Streaming", "#Gasy"],
  challenge: ["#DefiMusical", "#Challenge", "#VoteMoi"],
  post: ["#Communaute", "#Gasy"],
  profile: ["#Artiste", "#SoutienArtiste"],
  album: ["#Album", "#NouveauteMusique"],
  short: ["#Reels", "#Clip"],
  generic: ["#Musique"],
};

const KIND_LEAD: Record<ShareKind, string> = {
  track: "🎧 J'écoute en ce moment",
  challenge: "🏆 Je participe au défi",
  post: "💬 À voir sur Mascartube",
  profile: "🎤 Découvre cet artiste",
  album: "💽 Nouvel album à découvrir",
  short: "🎬 Regarde ce réel",
  generic: "✨ À découvrir sur Mascartube",
};

export type ShareTextInput = {
  url: string;
  title?: string | null;
  subtitle?: string | null;
  authorName?: string | null;
  badge?: string | null;
  kind?: ShareKind;
};

export function buildHashtags(input: ShareTextInput): string[] {
  const kind = input.kind ?? detectShareKind(input.url);
  const extra = input.badge
    ? ["#" + input.badge.replace(/[^\p{L}\p{N}]+/gu, "")].filter((t) => t.length > 2)
    : [];
  return [...new Set([...BASE_TAGS, ...KIND_TAGS[kind], ...extra])];
}

/** Texte de partage prêt à copier/coller, auto-rempli selon la page. */
export function buildShareText(input: ShareTextInput): string {
  const kind = input.kind ?? detectShareKind(input.url);
  const title = input.title?.trim() || "Mascartube";
  const author = input.authorName?.trim();
  const lead = KIND_LEAD[kind];

  const headline =
    kind === "profile"
      ? `${lead} : ${title}`
      : author && author !== title
        ? `${lead} « ${title} » de ${author}`
        : `${lead} « ${title} »`;

  const detail = input.subtitle && input.subtitle !== input.title ? input.subtitle.trim() : "";

  const cta =
    kind === "challenge"
      ? "👉 Écoute et vote pour moi ici :"
      : kind === "profile"
        ? "👉 Son profil et ses sons ici :"
        : "👉 Écoute gratuitement ici :";

  return [
    headline,
    detail,
    "",
    `${cta}\n${input.url}`,
    "",
    buildHashtags(input).join(" "),
  ]
    .filter((l, i) => l !== "" || i > 0)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
