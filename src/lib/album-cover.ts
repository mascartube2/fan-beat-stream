// Génération automatique d'une image de couverture d'album (canvas) avec le titre en vue.

const PALETTES: [string, string, string][] = [
  ["#7c3aed", "#db2777", "#fbbf24"],
  ["#0ea5e9", "#4f46e5", "#22d3ee"],
  ["#f97316", "#dc2626", "#fde68a"],
  ["#10b981", "#0f766e", "#a3e635"],
  ["#ec4899", "#8b5cf6", "#f472b6"],
  ["#f59e0b", "#111827", "#f8fafc"],
];

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

export function drawAlbumCover(
  canvas: HTMLCanvasElement,
  title: string,
  artist?: string,
  size = 1000,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = size;
  canvas.height = size;
  const seed = hash(`${title}|${artist ?? ""}`);
  const [c1, c2, c3] = PALETTES[seed % PALETTES.length];

  // Fond dégradé
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Cercles concentriques (vinyle abstrait)
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = c3;
  const cx = size * (0.3 + ((seed % 40) / 100));
  const cy = size * (0.28 + ((seed % 27) / 100));
  for (let r = size * 0.08; r < size * 0.95; r += size * 0.055) {
    ctx.lineWidth = size * 0.008;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Bandes diagonales
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = c3;
  ctx.translate(size * 0.5, size * 0.5);
  ctx.rotate(((seed % 60) - 30) * (Math.PI / 180));
  for (let i = -6; i < 6; i++) ctx.fillRect(-size, i * size * 0.11, size * 2, size * 0.03);
  ctx.restore();

  // Voile sombre en bas pour la lisibilité du texte
  const shade = ctx.createLinearGradient(0, size * 0.35, 0, size);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);

  // Titre
  const margin = size * 0.08;
  const maxWidth = size - margin * 2;
  let fontSize = size * 0.13;
  let lines: string[] = [];
  do {
    ctx.font = `800 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    lines = wrap(ctx, title.toUpperCase(), maxWidth);
    const tooWide = lines.some((l) => ctx.measureText(l).width > maxWidth);
    if (!tooWide && lines.length <= 3) break;
    fontSize *= 0.9;
  } while (fontSize > size * 0.05);

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = size * 0.03;
  const lineHeight = fontSize * 1.1;
  let y = size - margin - (artist ? fontSize * 0.95 : 0);
  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.fillText(lines[i], margin, y);
    y -= lineHeight;
  }
  ctx.shadowBlur = 0;

  if (artist) {
    ctx.font = `600 ${size * 0.045}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText(artist.toUpperCase(), margin, size - margin);
  }

  // Filet décoratif
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = size * 0.004;
  ctx.strokeRect(margin * 0.45, margin * 0.45, size - margin * 0.9, size - margin * 0.9);
}

export async function generateAlbumCoverFile(title: string, artist?: string): Promise<File> {
  const canvas = document.createElement("canvas");
  drawAlbumCover(canvas, title || "Album", artist);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("Impossible de générer la couverture");
  const slug = (title || "album").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new File([blob], `${slug || "album"}-cover.jpg`, { type: "image/jpeg" });
}
