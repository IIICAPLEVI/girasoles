/* ───────────────────────── el campo de girasoles ───────────────────────── */
import type { Ctx, Img, Rng } from "./utils";
import {
  TAU,
  GA,
  clamp,
  lerp,
  easeOutCubic,
  petalPath,
  leafPath,
  makeCanvas,
  glowSprites,
  xform,
  resetXform,
} from "./utils";

export interface FieldFlower {
  x: number;
  y: number;
  R: number;
  lean: number;
  spr: Img;
  headOff: number;
  wSpeed: number;
  wAmp: number;
  phase: number;
  delay: number;
  flip: boolean;
}

interface Pal {
  f0: string;
  f1: string;
  b0: string;
  b1: string;
}
const PALS: Pal[] = [
  { f0: "#ffe670", f1: "#ffb400", b0: "#d98f00", b1: "#7d4e06" },
  { f0: "#ffd94d", f1: "#ff9500", b0: "#c47a00", b1: "#6f4408" },
  { f0: "#fff3a0", f1: "#ffc23a", b0: "#d99400", b1: "#83540c" },
];

/* cabeza pequeña, dibujada en el origen */
function drawSmallHead(g: Ctx, R: number, pal: Pal, rng: Rng): void {
  const nB = R < 9 ? 8 : R < 16 ? 10 : 12;
  const nF = R < 9 ? 9 : R < 16 ? 12 : 15;

  /* pétalos traseros */
  let r0 = R * 0.3;
  let r1 = R * 0.86;
  let w = R * (R < 9 ? 0.24 : 0.2);
  let grad = g.createLinearGradient(0, -r0, 0, -r1);
  grad.addColorStop(0, pal.b0);
  grad.addColorStop(1, pal.b1);
  g.fillStyle = grad;
  for (let i = 0; i < nB; i++) {
    g.save();
    g.rotate((i * TAU) / nB);
    petalPath(g, r0, r1, w);
    g.fill();
    g.restore();
  }

  /* pétalos frontales */
  r0 = R * 0.3;
  r1 = R * 1.05;
  w = R * (R < 9 ? 0.3 : 0.26);
  grad = g.createLinearGradient(0, -r0, 0, -r1);
  grad.addColorStop(0, pal.f0);
  grad.addColorStop(1, pal.f1);
  g.fillStyle = grad;
  const outline = R > 8;
  if (outline) {
    g.strokeStyle = "rgba(90,50,0,.35)";
    g.lineWidth = Math.max(0.6, R * 0.035);
  }
  for (let i = 0; i < nF; i++) {
    g.save();
    g.rotate(Math.PI / nF + (i * TAU) / nF);
    petalPath(g, r0, r1, w);
    g.fill();
    if (outline) g.stroke();
    g.restore();
  }

  /* disco central */
  const cr = R * 0.55;
  const cg = g.createRadialGradient(-cr * 0.2, -cr * 0.25, cr * 0.1, 0, 0, cr);
  cg.addColorStop(0, "#6b4526");
  cg.addColorStop(0.55, "#4a2e17");
  cg.addColorStop(1, "#2a170a");
  g.fillStyle = cg;
  g.beginPath();
  g.arc(0, 0, cr, 0, TAU);
  g.fill();

  const K = R < 7 ? 26 : R < 14 ? 64 : 120;
  const c = (cr * 0.92) / Math.sqrt(K);
  const s = Math.max(0.55, c * 0.6);
  const cols = ["#5d3a1e", "#3a2412", "#8a5a2c"];
  for (let k = 0; k < K; k++) {
    const rr = c * Math.sqrt(k);
    const th = k * GA;
    g.fillStyle = k % 5 === 0 ? "#8a5a2c" : cols[k % 3];
    g.beginPath();
    g.arc(Math.cos(th) * rr, Math.sin(th) * rr, s, 0, TAU);
    g.fill();
  }
  if (R > 11) {
    /* anillo de florecillas doradas en el borde del disco */
    const N = Math.round(cr * 1.1);
    g.fillStyle = "rgba(255,196,90,.8)";
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU + rng.range(-0.06, 0.06);
      const rr = cr * rng.range(0.86, 0.95);
      g.beginPath();
      g.arc(Math.cos(a) * rr, Math.sin(a) * rr, s * 0.7, 0, TAU);
      g.fill();
    }
  }
  /* brillo suave */
  const hi = g.createRadialGradient(-cr * 0.35, -cr * 0.35, 0, -cr * 0.3, -cr * 0.3, cr * 0.9);
  hi.addColorStop(0, "rgba(255,235,180,.16)");
  hi.addColorStop(1, "rgba(255,235,180,0)");
  g.fillStyle = hi;
  g.beginPath();
  g.arc(0, 0, cr, 0, TAU);
  g.fill();
}

/* sprite completo (tallo + hojas + cabeza), horneado a resolución q */
function makeSprite(R: number, palIdx: number, q: number, rng: Rng): { img: Img; headOff: number } {
  const pad = R * 1.35;
  const stemH = R * 2.6;
  const w = Math.ceil(R * 5);
  const h = Math.ceil(pad + R * 2.1 + stemH + 3);
  const { c, g } = makeCanvas(w * q, h * q);
  g.scale(q, q);
  const cx = w / 2;
  const headY = pad + R;
  const baseY = h - 1;
  const pal = PALS[palIdx];

  const bend = rng.range(-0.22, 0.22) * R;
  g.lineCap = "round";
  g.strokeStyle = "#1f4d15";
  g.lineWidth = Math.max(1.6, R * 0.15);
  g.beginPath();
  g.moveTo(cx, baseY);
  g.quadraticCurveTo(cx - bend, lerp(baseY, headY, 0.55), cx + bend * 0.5, headY + R * 0.5);
  g.stroke();
  g.strokeStyle = "#3a7a27";
  g.lineWidth = Math.max(1.1, R * 0.1);
  g.stroke();

  g.fillStyle = "#2f6d21";
  g.save();
  g.translate(cx, baseY - stemH * 0.3);
  g.rotate(Math.PI * 0.8);
  leafPath(g, R * 1.25, 0.3);
  g.fill();
  g.restore();
  g.fillStyle = "#2a611d";
  g.save();
  g.translate(cx, baseY - stemH * 0.52);
  g.rotate(Math.PI * 0.22);
  leafPath(g, R * 1.05, 0.3);
  g.fill();
  g.restore();

  g.save();
  g.translate(cx, headY);
  drawSmallHead(g, R, pal, rng);
  g.restore();

  return { img: { c, w, h }, headOff: baseY - headY };
}

export function buildField(W: number, H: number, M: number, q: number, rng: Rng): FieldFlower[] {
  const vert = H > W * 1.2;
  const yTop = vert ? H * 0.6 : H * 0.505;
  const yBot = H * 0.965;
  const rows = vert ? 6 : 7;
  const cache = new Map<string, { img: Img; headOff: number }>();
  const out: FieldFlower[] = [];

  for (let i = 0; i < rows; i++) {
    const u = i / (rows - 1);
    const y = lerp(yTop, yBot, vert ? u : Math.pow(u, 1.6)) + rng.range(-H * 0.008, H * 0.008);
    const baseR = lerp(
      M * 0.008,
      M * (vert ? 0.052 : 0.034),
      vert ? Math.pow(u, 1.1) : Math.pow(u, 1.35),
    );
    const count = Math.round(lerp(vert ? 18 : 26, vert ? 6 : 7, u));
    for (let j = 0; j < count; j++) {
      const x = ((j + rng.range(0.05, 0.95)) / count) * (W + M * 0.06) - M * 0.03;
      /* claro central para el ramo (se estrecha hacia el frente) */
      const clearHalf = M * (vert ? 0.24 : 0.2) * (1 - 0.35 * u);
      if (Math.abs(x - W / 2) < clearHalf && y > H * 0.5) continue;

      const Rq = Math.max(3, Math.round(baseR * rng.range(0.85, 1.2)));
      const headTop = y - Rq * 3.45;
      const dx = W / 2 - x;
      const dyUp = Math.max(40, headTop - H * 0.42);
      const lean = clamp(Math.atan2(dx, dyUp) * 0.35, -0.35, 0.35);
      const palIdx = rng.int(PALS.length);
      const key = Rq + "|" + palIdx;
      let spr = cache.get(key);
      if (!spr) {
        spr = makeSprite(Rq, palIdx, q, rng);
        cache.set(key, spr);
      }
      const dist = Math.hypot(x - W / 2, y - H * 0.5) / M;
      out.push({
        x,
        y,
        R: Rq,
        lean,
        spr: spr.img,
        headOff: spr.headOff,
        wSpeed: rng.range(0.5, 1.1),
        wAmp: rng.range(0.03, 0.06),
        phase: rng.range(0, TAU),
        delay: dist * 1.1 + rng.range(0, 0.35),
        flip: rng.chance(0.5),
      });
    }
  }
  out.sort((a, b) => a.y - b.y);
  return out;
}

export function drawField(
  g: Ctx,
  dpr: number,
  field: FieldFlower[],
  t: number,
  bloom: number,
  motion: number,
): void {
  if (t <= 0) return;
  const orient = 0.35 + 0.65 * bloom;
  const GOLD = glowSprites().GOLD;

  /* pasada 1: halos (aditivo) */
  g.globalCompositeOperation = "lighter";
  for (const f of field) {
    const ap = easeOutCubic(clamp((t - f.delay) / 0.9, 0, 1));
    if (ap <= 0) continue;
    const grow = 0.55 + 0.45 * ap;
    const a = f.lean * orient + Math.sin(t * f.wSpeed + f.phase) * f.wAmp * motion;
    const hx = f.x + Math.sin(a) * f.headOff * grow;
    const hy = f.y - Math.cos(a) * f.headOff * grow;
    const s = f.R * 5 * grow;
    g.globalAlpha = ap * (0.27 + 0.08 * Math.sin(t * 0.9 + f.phase * 3));
    g.drawImage(GOLD, hx - s / 2, hy - s / 2, s, s);
  }
  g.globalCompositeOperation = "source-over";

  /* pasada 2: flores (crecen desde la base al aparecer) */
  for (const f of field) {
    const ap = easeOutCubic(clamp((t - f.delay) / 0.9, 0, 1));
    if (ap <= 0) continue;
    const grow = 0.55 + 0.45 * ap;
    const a = f.lean * orient + Math.sin(t * f.wSpeed + f.phase) * f.wAmp * motion;
    xform(g, dpr, f.x, f.y, a, f.flip ? -grow : grow, grow);
    g.globalAlpha = ap;
    g.drawImage(f.spr.c, -f.spr.w / 2, -f.spr.h + 1, f.spr.w, f.spr.h);
  }
  resetXform(g, dpr);
  g.globalAlpha = 1;
}
