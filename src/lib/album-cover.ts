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

/** Panneau des morceaux en bas de la pochette (1 ou 2 colonnes). Retourne le Y du haut du panneau. */
function drawTrackPanel(
  ctx: CanvasRenderingContext2D,
  size: number,
  tracks: string[],
  color: string,
  dark: boolean,
): number {
  const margin = size * 0.075;
  const list = tracks.map((t) => t.trim()).filter(Boolean).slice(0, 10);
  if (!list.length) return size - margin;

  const cols = list.length > 5 ? 2 : 1;
  const rows = Math.ceil(list.length / cols);
  const fontSize = size * (cols === 2 ? 0.026 : 0.03);
  const lineHeight = fontSize * 1.75;
  const headSize = size * 0.022;
  const panelH = headSize * 2.4 + rows * lineHeight;
  const top = size - margin - panelH;

  ctx.save();
  // Séparateur
  ctx.strokeStyle = dark ? "rgba(15,23,42,0.25)" : "rgba(255,255,255,0.35)";
  ctx.lineWidth = Math.max(1, size * 0.0015);
  ctx.beginPath();
  ctx.moveTo(margin, top);
  ctx.lineTo(size - margin, top);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.globalAlpha = dark ? 0.55 : 0.7;
  ctx.font = `700 ${headSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillText(`TITRES · ${list.length}`, margin, top + headSize * 1.3);

  const colWidth = (size - margin * 2 - (cols === 2 ? size * 0.04 : 0)) / cols;
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  for (let i = 0; i < list.length; i++) {
    const col = Math.floor(i / rows);
    const row = i % rows;
    const x = margin + col * (colWidth + size * 0.04);
    const y = top + headSize * 2.4 + row * lineHeight + lineHeight / 2;
    const num = String(i + 1).padStart(2, "0");
    ctx.globalAlpha = dark ? 0.45 : 0.6;
    ctx.fillText(num, x, y);
    const numW = ctx.measureText("00").width + size * 0.014;
    ctx.globalAlpha = dark ? 0.92 : 0.95;
    let text = list[i].toUpperCase();
    const maxW = colWidth - numW;
    if (ctx.measureText(text).width > maxW) {
      while (text.length > 3 && ctx.measureText(`${text}…`).width > maxW) text = text.slice(0, -1);
      text = `${text}…`;
    }
    ctx.fillText(text, x + numW, y);
  }
  ctx.restore();
  return top;
}

/** Grand titre affiché en haut, avec le nom de l'artiste au-dessus. */
function drawBigTitle(
  ctx: CanvasRenderingContext2D,
  size: number,
  title: string,
  artist: string | undefined,
  color: string,
  bottomLimit: number,
  shadow: boolean,
) {
  const margin = size * 0.075;
  const maxWidth = size - margin * 2;
  let top = margin;

  if (artist) {
    ctx.save();
    ctx.font = `700 ${size * 0.026}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.75;
    ctx.fillText(artist.toUpperCase(), margin, top);
    ctx.restore();
    top += size * 0.05;
  }

  const available = bottomLimit - size * 0.05 - top;
  let fontSize = size * 0.155;
  let lines: string[] = [];
  for (;;) {
    ctx.font = `800 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    lines = wrap(ctx, title.toUpperCase(), maxWidth, 3);
    const tooWide = lines.some((l) => ctx.measureText(l).width > maxWidth);
    const tooTall = lines.length * fontSize * 1.05 > available;
    if ((!tooWide && !tooTall) || fontSize <= size * 0.05) break;
    fontSize *= 0.92;
  }

  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  if (shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = size * 0.025;
  }
  const lineHeight = fontSize * 1.05;
  lines.forEach((l, i) => ctx.fillText(l, margin, top + i * lineHeight));
  ctx.restore();

  // Filet sous le titre
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(2, size * 0.005);
  const uy = top + lines.length * lineHeight + size * 0.018;
  ctx.beginPath();
  ctx.moveTo(margin, uy);
  ctx.lineTo(margin + size * 0.16, uy);
  ctx.stroke();
  ctx.restore();
}

export function drawAlbumCover(
  canvas: HTMLCanvasElement,
  title: string,
  artist?: string,
  size = 1000,
  style: CoverStyleId = "vinyl",
  tracks: string[] = [],
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
    const limit = drawTrackPanel(ctx, size, tracks, "#0f172a", true);
    drawBigTitle(ctx, size, title || "Album", artist, "#0f172a", limit, false);
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
    const cx = size * (0.62 + ((seed % 20) / 100));
    const cy = size * (0.3 + ((seed % 15) / 100));
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

  // Voile pour la lisibilité (haut + bas)
  const shadeTop = ctx.createLinearGradient(0, 0, 0, size * 0.55);
  shadeTop.addColorStop(0, "rgba(0,0,0,0.55)");
  shadeTop.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadeTop;
  ctx.fillRect(0, 0, size, size * 0.55);
  const shade = ctx.createLinearGradient(0, size * 0.45, 0, size);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);

  const limit = drawTrackPanel(ctx, size, tracks, "#ffffff", false);
  drawBigTitle(ctx, size, title || "Album", artist, "#ffffff", limit, true);

  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = size * 0.004;
  ctx.strokeRect(margin * 0.42, margin * 0.42, size - margin * 0.84, size - margin * 0.84);
}


export async function generateAlbumCoverFile(
  title: string,
  artist?: string,
  style: CoverStyleId = "vinyl",
  tracks: string[] = [],
): Promise<File> {
  const canvas = document.createElement("canvas");
  drawAlbumCover(canvas, title || "Album", artist, 1000, style, tracks);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("Impossible de générer la couverture");
  const slug = (title || "album").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new File([blob], `${slug || "album"}-${style}.jpg`, { type: "image/jpeg" });
}
