// Génération automatique d'images de couverture d'album (canvas) avec le titre en vue.
// 6 styles sélectionnables.

export type CoverStyleId = "vinyl" | "stripes" | "blocks" | "minimal" | "halftone" | "spotlight";

export const COVER_STYLES: { id: CoverStyleId; label: string }[] = [
  { id: "vinyl", label: "Vinyle" },
  { id: "stripes", label: "Bandes" },
  { id: "blocks", label: "Blocs" },
  { id: "minimal", label: "Minimal" },
  { id: "halftone", label: "Points" },
  { id: "spotlight", label: "Spot" },
];

const PALETTES: Record<CoverStyleId, [string, string, string]> = {
  vinyl: ["#7c3aed", "#db2777", "#fbbf24"],
  stripes: ["#0ea5e9", "#4f46e5", "#22d3ee"],
  blocks: ["#f97316", "#dc2626", "#fde68a"],
  minimal: ["#0f172a", "#1e293b", "#f8fafc"],
  halftone: ["#10b981", "#0f766e", "#a3e635"],
  spotlight: ["#111827", "#4c1d95", "#f59e0b"],
};

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 4) {
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
  return lines.slice(0, maxLines);
}

function drawTitle(
  ctx: CanvasRenderingContext2D,
  size: number,
  title: string,
  artist: string | undefined,
  opts: { color: string; align: "bottom" | "center"; startSize: number; shadow?: boolean },
) {
  const margin = size * 0.08;
  const maxWidth = size - margin * 2;
  let fontSize = size * opts.startSize;
  let lines: string[] = [];
  for (;;) {
    ctx.font = `800 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    lines = wrap(ctx, title.toUpperCase(), maxWidth);
    const tooWide = lines.some((l) => ctx.measureText(l).width > maxWidth);
    if ((!tooWide && lines.length <= 3) || fontSize <= size * 0.05) break;
    fontSize *= 0.9;
  }
  ctx.fillStyle = opts.color;
  ctx.textAlign = opts.align === "center" ? "center" : "left";
  ctx.textBaseline = "alphabetic";
  if (opts.shadow !== false) {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = size * 0.03;
  }
  const lineHeight = fontSize * 1.1;
  const x = opts.align === "center" ? size / 2 : margin;
  let y =
    opts.align === "center"
      ? size / 2 + (lines.length - 1) * lineHeight * 0.5
      : size - margin - (artist ? fontSize * 0.95 : 0);
  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.fillText(lines[i], x, y);
    y -= lineHeight;
  }
  ctx.shadowBlur = 0;
  if (artist) {
    ctx.font = `600 ${size * 0.042}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = opts.color === "#0f172a" ? "rgba(15,23,42,0.7)" : "rgba(255,255,255,0.82)";
    const ay = opts.align === "center" ? size / 2 + lineHeight * 1.3 : size - margin;
    ctx.fillText(artist.toUpperCase(), x, ay);
  }
  ctx.textAlign = "left";
}

export function drawAlbumCover(
  canvas: HTMLCanvasElement,
  title: string,
  artist?: string,
  size = 1000,
  style: CoverStyleId = "vinyl",
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);
  const seed = hash(`${title}|${artist ?? ""}`);
  const [c1, c2, c3] = PALETTES[style] ?? PALETTES.vinyl;
  const margin = size * 0.08;

  if (style === "minimal") {
    ctx.fillStyle = c3;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = c1;
    ctx.lineWidth = size * 0.006;
    ctx.strokeRect(margin * 0.6, margin * 0.6, size - margin * 1.2, size - margin * 1.2);
    ctx.fillStyle = c2;
    ctx.fillRect(margin, size * 0.32, size * 0.22, size * 0.012);
    drawTitle(ctx, size, title, artist, { color: "#0f172a", align: "bottom", startSize: 0.12, shadow: false });
    return;
  }

  // Fond dégradé
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  if (style === "vinyl") {
    ctx.save();
    ctx.globalAlpha = 0.2;
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
  } else if (style === "stripes") {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = c3;
    ctx.translate(size * 0.5, size * 0.5);
    ctx.rotate(((seed % 60) - 30) * (Math.PI / 180));
    for (let i = -8; i < 8; i++) ctx.fillRect(-size, i * size * 0.11, size * 2, size * 0.035);
    ctx.restore();
  } else if (style === "blocks") {
    const cells = 4;
    const cell = size / cells;
    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        if ((seed + i * 7 + j * 13) % 3 === 0) {
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = j % 2 === 0 ? c3 : "#000000";
          ctx.fillRect(i * cell, j * cell, cell, cell);
        }
      }
    }
    ctx.globalAlpha = 1;
  } else if (style === "halftone") {
    ctx.fillStyle = c3;
    const step = size / 18;
    for (let x = step / 2; x < size; x += step) {
      for (let y = step / 2; y < size; y += step) {
        const r = (step / 2.4) * (0.25 + (y / size) * 0.9);
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  } else if (style === "spotlight") {
    const rg = ctx.createRadialGradient(size * 0.5, size * 0.38, size * 0.05, size * 0.5, size * 0.38, size * 0.6);
    rg.addColorStop(0, c3);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 1;
  }

  // Voile sombre en bas pour la lisibilité du texte
  const shade = ctx.createLinearGradient(0, size * 0.35, 0, size);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);

  drawTitle(ctx, size, title, artist, {
    color: "#ffffff",
    align: style === "spotlight" ? "center" : "bottom",
    startSize: 0.13,
  });

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = size * 0.004;
  ctx.strokeRect(margin * 0.45, margin * 0.45, size - margin * 0.9, size - margin * 0.9);
}

export async function generateAlbumCoverFile(
  title: string,
  artist?: string,
  style: CoverStyleId = "vinyl",
): Promise<File> {
  const canvas = document.createElement("canvas");
  drawAlbumCover(canvas, title || "Album", artist, 1000, style);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("Impossible de générer la couverture");
  const slug = (title || "album").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new File([blob], `${slug || "album"}-${style}.jpg`, { type: "image/jpeg" });
}
