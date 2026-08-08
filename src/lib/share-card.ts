// Génération d'une carte de partage 1080×1080 (cover + titre + QR code)
// destinée à être postée sur Facebook / TikTok / WhatsApp.
import QRCode from "qrcode";

export type ShareCardInput = {
  title: string;
  subtitle?: string | null;
  coverUrl?: string | null;
  url: string;
  badge?: string | null;
  brand?: string;
};

const SIZE = 1080;
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = w;
      if (lines.length === maxLines) break;
    } else {
      current = next;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines && words.length) {
    let last = lines[maxLines - 1];
    while (last.length > 4 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    if (ctx.measureText(text).width > maxWidth * maxLines) lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

export async function generateShareCard(input: ShareCardInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  const cover = input.coverUrl ? await loadImage(input.coverUrl) : null;

  // Fond : cover floutée agrandie, sinon dégradé de marque
  if (cover) {
    ctx.filter = "blur(48px) brightness(0.5) saturate(1.3)";
    ctx.drawImage(cover, -80, -80, SIZE + 160, SIZE + 160);
    ctx.filter = "none";
  } else {
    const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    g.addColorStop(0, "#3b1268");
    g.addColorStop(0.55, "#7c3aed");
    g.addColorStop(1, "#db2777");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  // Voile sombre pour la lisibilité
  const veil = ctx.createLinearGradient(0, 0, 0, SIZE);
  veil.addColorStop(0, "rgba(8,8,16,0.55)");
  veil.addColorStop(0.5, "rgba(8,8,16,0.35)");
  veil.addColorStop(1, "rgba(8,8,16,0.9)");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Marque
  ctx.font = `800 40px ${FONT}`;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText((input.brand ?? "MASCARTUBE").toUpperCase(), 72, 86);
  ctx.font = `600 26px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("Musique · Réels · Communauté", 72, 132);

  // Cover carrée
  const artSize = 520;
  const artX = (SIZE - artSize) / 2;
  const artY = 190;
  ctx.save();
  roundRect(ctx, artX, artY, artSize, artSize, 44);
  ctx.clip();
  if (cover) {
    ctx.drawImage(cover, artX, artY, artSize, artSize);
  } else {
    const g2 = ctx.createLinearGradient(artX, artY, artX + artSize, artY + artSize);
    g2.addColorStop(0, "#7c3aed");
    g2.addColorStop(1, "#fbbf24");
    ctx.fillStyle = g2;
    ctx.fillRect(artX, artY, artSize, artSize);
    ctx.font = `800 180px ${FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.textAlign = "center";
    ctx.fillText(input.title.charAt(0).toUpperCase(), SIZE / 2, artY + artSize / 2);
    ctx.textAlign = "left";
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 3;
  roundRect(ctx, artX, artY, artSize, artSize, 44);
  ctx.stroke();

  // Badge
  if (input.badge) {
    ctx.font = `700 26px ${FONT}`;
    const w = ctx.measureText(input.badge).width + 44;
    const bx = artX;
    const by = artY + artSize + 28;
    const bg = ctx.createLinearGradient(bx, by, bx + w, by + 52);
    bg.addColorStop(0, "#7c3aed");
    bg.addColorStop(1, "#db2777");
    ctx.fillStyle = bg;
    roundRect(ctx, bx, by, w, 52, 26);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(input.badge, bx + 22, by + 27);
  }

  // Titre + sous-titre
  const textTop = artY + artSize + (input.badge ? 116 : 74);
  ctx.font = `800 66px ${FONT}`;
  ctx.fillStyle = "#ffffff";
  const lines = fitLines(ctx, input.title, SIZE - 380, 2);
  lines.forEach((l, i) => ctx.fillText(l, 72, textTop + i * 78));

  if (input.subtitle) {
    ctx.font = `600 40px ${FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    const sub = fitLines(ctx, input.subtitle, SIZE - 380, 1);
    ctx.fillText(sub[0] ?? "", 72, textTop + lines.length * 78 + 18);
  }

  // QR code
  const qrSize = 216;
  const qrX = SIZE - qrSize - 72;
  const qrY = SIZE - qrSize - 96;
  const qrData = await QRCode.toDataURL(input.url, { width: 512, margin: 1 });
  const qrImg = await loadImage(qrData);
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 28);
  ctx.fill();
  if (qrImg) ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  ctx.font = `600 22px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.textAlign = "center";
  ctx.fillText("Scanne pour écouter", qrX + qrSize / 2, SIZE - 52);
  ctx.textAlign = "left";

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/png", 0.95),
  );
}

export function shareCardFileName(title: string) {
  return `mascartube-${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40) || "partage"}.png`;
}
