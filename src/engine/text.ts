/* ───────────────────────── mensaje final (sprite con brillo horneado) ───────────────────────── */
import type { Ctx, Img } from "./utils";
import { clamp, easeOutCubic, makeCanvas } from "./utils";

export interface Messages {
  titulo: string;
  subtitulo: string;
  firma?: string;
}

const F_TITLE = (px: number): string => `${px}px "Great Vibes", "Brush Script MT", "Segoe Script", cursive`;
const F_SUB = (px: number): string => `italic 500 ${px}px "Cormorant Garamond", Georgia, "Times New Roman", serif`;
const F_SIG = (px: number): string => `italic 400 ${px}px "Cormorant Garamond", Georgia, "Times New Roman", serif`;

export function bakeText(msg: Messages, W: number, H: number, M: number, q: number): Img {
  const vert = H > W * 1.2;
  let px = clamp(vert ? W * 0.165 : M * 0.08, 30, 80);
  const probe = makeCanvas(1, 1).g;
  const measure = (): [number, number, number] => {
    probe.font = F_TITLE(px);
    const w1 = probe.measureText(msg.titulo).width;
    probe.font = F_SUB(px * 0.4);
    const w2 = probe.measureText(msg.subtitulo).width;
    probe.font = F_SIG(px * 0.31);
    const w3 = msg.firma ? probe.measureText(msg.firma).width : 0;
    return [w1, w2, w3];
  };
  let ws = measure();
  const maxW = W * 0.92;
  for (let i = 0; i < 4 && Math.max(...ws) > maxW; i++) {
    px *= maxW / Math.max(...ws);
    ws = measure();
  }

  const w = Math.ceil(Math.max(...ws) + 120);
  const h = Math.ceil(px * (msg.firma ? 2.75 : 2.3));
  const { c, g } = makeCanvas(w * q, h * q);
  g.scale(q, q);
  g.textAlign = "center";
  g.textBaseline = "middle";
  const cx = w / 2;
  const y1 = px * 0.78;
  const y2 = y1 + px * 0.82;
  const y3 = y2 + px * 0.5;

  /* título: doble pasada (halo amplio + núcleo nítido) */
  g.font = F_TITLE(px);
  g.shadowColor = "rgba(255,180,60,.85)";
  g.shadowBlur = px * 0.55;
  g.fillStyle = "rgba(255,214,110,1)";
  g.fillText(msg.titulo, cx, y1);
  g.shadowColor = "rgba(255,230,160,.9)";
  g.shadowBlur = px * 0.12;
  g.fillStyle = "#fff0b8";
  g.fillText(msg.titulo, cx, y1);

  /* divisor dorado */
  const dw = Math.min(w * 0.42, px * 3.2);
  const dg = g.createLinearGradient(cx - dw, 0, cx + dw, 0);
  dg.addColorStop(0, "rgba(255,214,130,0)");
  dg.addColorStop(0.5, "rgba(255,214,130,.85)");
  dg.addColorStop(1, "rgba(255,214,130,0)");
  g.shadowBlur = 6;
  g.shadowColor = "rgba(255,200,100,.6)";
  g.fillStyle = dg;
  g.fillRect(cx - dw, y1 + px * 0.44, dw * 2, 1);

  g.shadowBlur = px * 0.16;
  g.shadowColor = "rgba(255,200,110,.6)";
  g.font = F_SUB(px * 0.4);
  g.fillStyle = "rgba(252,238,205,.97)";
  g.fillText(msg.subtitulo, cx, y2);

  if (msg.firma) {
    g.shadowBlur = px * 0.12;
    g.font = F_SIG(px * 0.31);
    g.fillStyle = "rgba(255,216,150,.85)";
    g.fillText(msg.firma, cx, y3);
  }

  return { c, w, h };
}

export function drawText(g: Ctx, spr: Img, t: number, at: number, W: number, H: number, textAt: number): void {
  const a = easeOutCubic(clamp((t - textAt) / 1.6, 0, 1));
  if (a <= 0) return;
  const y = H * 0.115 + Math.sin(at * 0.8) * 4;
  const s = 0.94 + 0.06 * a;
  g.save();
  g.globalAlpha = a;
  g.translate(W / 2, y);
  g.scale(s, s);
  g.drawImage(spr.c, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
  g.restore();
  g.globalAlpha = 1;
}
