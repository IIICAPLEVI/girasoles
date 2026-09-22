/* ═══════════════════════════ EL RAMO DE GIRASOLES ═══════════════════════════
   Ramo "atado a mano": cúpula de 9 girasoles, tallos visibles que convergen
   en la cintura y un listón satinado con moño. Sin papel ni hojas decorativas.

   Rendimiento: cada cabeza se hornea en 3 sprites (pétalo trasero, pétalo
   frontal, disco de semillas) y la animación de florecer sólo hace drawImage.
   Al terminar, la cabeza completa y toda la parte estática (tallos, listón)
   se hornean a un solo sprite.                                               */
import type { Ctx, Img, Pt, Rng } from "./utils";
import {
  TAU,
  GA,
  clamp,
  lerp,
  easeOutCubic,
  easeInOutCubic,
  easeOutBack,
  petalPath,
  makeCanvas,
  glowSprites,
  glowAt,
} from "./utils";
import type { Particles } from "./particles";

/* ---------- definición de la cúpula (unidades de R0, de atrás hacia adelante) ---------- */
interface HeadDef {
  x: number;
  y: number;
  r: number;
  dl: number;
  tilt: number;
  pal: number;
}
const HEADS_DEF: HeadDef[] = [
  { x: 0.0, y: -1.42, r: 0.6, dl: 0.0, tilt: 0, pal: 1 },
  { x: -1.12, y: -0.98, r: 0.7, dl: 0.08, tilt: -1, pal: 0 },
  { x: 1.12, y: -0.96, r: 0.7, dl: 0.14, tilt: 1, pal: 2 },
  { x: -1.45, y: 0.2, r: 0.64, dl: 0.22, tilt: -1, pal: 2 },
  { x: 1.45, y: 0.22, r: 0.64, dl: 0.28, tilt: 1, pal: 1 },
  { x: -0.85, y: 1.1, r: 0.66, dl: 0.36, tilt: -1, pal: 1 },
  { x: 0.87, y: 1.12, r: 0.66, dl: 0.42, tilt: 1, pal: 0 },
  { x: 0.0, y: -0.05, r: 1.0, dl: 0.5, tilt: 0, pal: 0 },
  { x: 0.0, y: 1.3, r: 0.54, dl: 0.6, tilt: 0, pal: 2 },
];

interface Pal {
  f0: string;
  f1: string;
  b0: string;
  b1: string;
}
const PALS: Pal[] = [
  { f0: "#ffe873", f1: "#ffb300", b0: "#d18f12", b1: "#7d4e06" },
  { f0: "#ffdf5e", f1: "#ffa012", b0: "#c47f0a", b1: "#6f4408" },
  { f0: "#fff1a6", f1: "#ffc02e", b0: "#d09216", b1: "#83540c" },
];

const RIB = {
  base: "#c62f4f",
  light: "#ef6f8c",
  dark: "#7a1129",
  edge: "rgba(60,5,20,.55)",
  sheen: "rgba(255,220,228,.5)",
};

export interface Head {
  x: number;
  y: number;
  R: number;
  cr: number;
  dl: number;
  rot: number;
  sx: number;
  sy: number;
  swayA: number;
  swayW: number;
  ph: number;
  petalB: Img;
  petalF: Img;
  disc: Img;
  full: Img | null;
}
interface Stem {
  pts: Pt[];
  p0: Pt;
  e: Pt;
  w: number;
  col: string;
}
interface Baby {
  x: number;
  y: number;
  spr: Img;
  tw: Pt[];
  ph: number;
}
interface Sparkle {
  ph: number;
  seed: number;
}

export interface Timeline {
  stemStart: number;
  stemDur: number;
  headBase: number;
  bud: number;
  petals: number;
  seeds: number;
  ribbonStart: number;
  ribbonDur: number;
  burstAt: number;
  textAt: number;
}

export interface Bouquet {
  cx: number;
  cy: number;
  R0: number;
  wx: number;
  wy: number;
  q: number;
  heads: Head[];
  stems: Stem[];
  babies: Baby[];
  sparkles: Sparkle[];
  statik: Img | null;
  statX: number;
  statY: number;
  burstDone: boolean;
  lastHeart: number;
  tb: Timeline;
}

/* ═══════════ horneado de sprites de una cabeza ═══════════ */
function bakePetal(R: number, r0: number, r1: number, w: number, c0: string, c1: string, q: number, front: boolean): Img {
  const W2 = w * 1.3 + 2;
  const Hh = r1 + 3;
  const { c, g } = makeCanvas(2 * W2 * q, Hh * q);
  g.scale(q, q);
  g.translate(W2, Hh);
  const grad = g.createLinearGradient(0, -r0, 0, -r1);
  grad.addColorStop(0, c0);
  grad.addColorStop(1, c1);
  g.fillStyle = grad;
  petalPath(g, r0, r1, w);
  g.fill();
  g.lineJoin = "round";
  if (front) {
    g.strokeStyle = "rgba(120,60,0,.32)";
    g.lineWidth = Math.max(0.8, R * 0.014);
    g.stroke();
    /* vena central */
    g.strokeStyle = "rgba(170,95,10,.22)";
    g.lineWidth = Math.max(0.7, R * 0.012);
    g.beginPath();
    g.moveTo(0, -r0 - 1);
    g.lineTo(0, -r1 + (r1 - r0) * 0.14);
    g.stroke();
    /* reflejo lateral */
    g.strokeStyle = "rgba(255,255,225,.28)";
    g.lineWidth = Math.max(0.8, R * 0.016);
    g.beginPath();
    g.moveTo(-w * 0.55, -(r0 + (r1 - r0) * 0.3));
    g.quadraticCurveTo(-w * 0.5, -(r0 + (r1 - r0) * 0.62), -w * 0.12, -(r1 - (r1 - r0) * 0.1));
    g.stroke();
  } else {
    g.strokeStyle = "rgba(80,40,0,.28)";
    g.lineWidth = Math.max(0.8, R * 0.012);
    g.stroke();
  }
  return { c, w: 2 * W2, h: Hh };
}

function bakeDisc(cr: number, q: number, rng: Rng): Img {
  const S = cr * 2 + 6;
  const { c, g } = makeCanvas(S * q, S * q);
  g.scale(q, q);
  g.translate(S / 2, S / 2);
  const base = g.createRadialGradient(-cr * 0.2, -cr * 0.25, cr * 0.05, 0, 0, cr);
  base.addColorStop(0, "#7a4e26");
  base.addColorStop(0.5, "#4e3014");
  base.addColorStop(1, "#261507");
  g.fillStyle = base;
  g.beginPath();
  g.arc(0, 0, cr, 0, TAU);
  g.fill();

  /* semillas en espiral de Fibonacci */
  const K = clamp(Math.round(cr * cr * 0.1), 70, 800);
  const cc = (cr * 0.92) / Math.sqrt(K);
  const cols = ["#5d3a1e", "#4a2c14", "#6d4522", "#8a5a2c", "#9c6c30"];
  for (let k = 0; k < K; k++) {
    const rr = cc * Math.sqrt(k);
    const th = k * GA;
    const u = rng.next();
    g.fillStyle = u < 0.05 ? "#d99a2d" : cols[Math.floor(u * 5) % 5];
    const sr = cc * 0.6 * (0.85 + 0.3 * (rr / cr));
    g.beginPath();
    g.arc(Math.cos(th) * rr, Math.sin(th) * rr, sr, 0, TAU);
    g.fill();
  }
  /* anillo de florecillas doradas en el borde */
  const N = Math.round(cr * 0.9);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU + rng.range(-0.05, 0.05);
    const rr = cr * rng.range(0.86, 0.96);
    g.fillStyle = rng.chance(0.5) ? "rgba(255,200,90,.9)" : "rgba(232,160,60,.8)";
    g.beginPath();
    g.arc(Math.cos(a) * rr, Math.sin(a) * rr, cc * 0.45, 0, TAU);
    g.fill();
  }
  /* viñeta + reflejo */
  const vig = g.createRadialGradient(0, 0, cr * 0.5, 0, 0, cr);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,.38)");
  g.fillStyle = vig;
  g.beginPath();
  g.arc(0, 0, cr, 0, TAU);
  g.fill();
  const hi = g.createRadialGradient(-cr * 0.35, -cr * 0.35, 0, -cr * 0.3, -cr * 0.3, cr * 0.85);
  hi.addColorStop(0, "rgba(255,230,170,.18)");
  hi.addColorStop(1, "rgba(255,230,170,0)");
  g.fillStyle = hi;
  g.beginPath();
  g.arc(0, 0, cr, 0, TAU);
  g.fill();
  g.strokeStyle = "rgba(255,190,90,.5)";
  g.lineWidth = Math.max(1, cr * 0.04);
  g.beginPath();
  g.arc(0, 0, cr * 0.985, 0, TAU);
  g.stroke();
  return { c, w: S, h: S };
}

const NB = 16;
const NF = 22;
function drawPetalRing(g: Ctx, img: Img, N: number, off: number, petB: number, lag: number, bud: number): void {
  /* `lag` retrasa el arranque del anillo sin alterar el final (petB=1 ⇒ todos completos) */
  const pb = petB * (1 + lag) - lag;
  for (let i = 0; i < N; i++) {
    const p = easeOutBack(clamp((pb - (i / N) * 0.55) / 0.45, 0, 1)) * bud;
    if (p <= 0.002) continue;
    g.save();
    g.rotate(off + (i * TAU) / N);
    g.scale(p, p);
    g.drawImage(img.c, -img.w / 2, -img.h, img.w, img.h);
    g.restore();
  }
}

/** cabeza en el origen, con progreso de capullo / pétalos / semillas */
function drawHeadLive(g: Ctx, h: Head, bud: number, petB: number, seed: number): void {
  drawPetalRing(g, h.petalB, NB, Math.PI / NB, petB, 0, bud);
  drawPetalRing(g, h.petalF, NF, 0, petB, 0.07, bud);
  const cr = h.cr;
  g.save();
  g.scale(bud, bud);
  g.fillStyle = "#3a2210";
  g.beginPath();
  g.arc(0, 0, cr, 0, TAU);
  g.fill();
  if (seed > 0) {
    const e = easeOutCubic(seed);
    if (e < 1) {
      g.beginPath();
      g.arc(0, 0, cr * e * 1.02, 0, TAU);
      g.clip();
    }
    g.drawImage(h.disc.c, -h.disc.w / 2, -h.disc.h / 2, h.disc.w, h.disc.h);
    if (e < 1) {
      g.strokeStyle = `rgba(255,222,150,${(1 - e) * 0.9})`;
      g.lineWidth = Math.max(1.5, cr * 0.06);
      g.beginPath();
      g.arc(0, 0, cr * e, 0, TAU);
      g.stroke();
    }
  }
  g.restore();
}

function bakeFull(h: Head, q: number): void {
  const S = h.R * 2.4;
  const { c, g } = makeCanvas(S * q, S * q);
  g.scale(q, q);
  g.translate(S / 2, S / 2);
  drawHeadLive(g, h, 1, 1, 1);
  h.full = { c, w: S, h: S };
}

function bakeBaby(R0: number, q: number, rng: Rng): { spr: Img; tw: Pt[] } {
  const S = R0 * 0.62;
  const { c, g } = makeCanvas(S * q, S * q);
  g.scale(q, q);
  g.translate(S / 2, S / 2);
  const WHITE = glowSprites().WHITE;
  const n = 6 + rng.int(3);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    pts.push({ x: rng.range(-R0 * 0.2, R0 * 0.2), y: rng.range(-R0 * 0.18, R0 * 0.18) });
  }
  g.globalCompositeOperation = "lighter";
  for (const p of pts) {
    const gs = R0 * 0.16;
    g.globalAlpha = 0.55;
    g.drawImage(WHITE, p.x - gs / 2, p.y - gs / 2, gs, gs);
  }
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  const dr = Math.max(1, R0 * 0.018);
  for (const p of pts) {
    /* florecilla de 5 pétalos diminutos */
    g.fillStyle = "rgba(255,252,240,.95)";
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU;
      g.beginPath();
      g.arc(p.x + Math.cos(a) * dr * 0.9, p.y + Math.sin(a) * dr * 0.9, dr * 0.75, 0, TAU);
      g.fill();
    }
    g.fillStyle = "rgba(255,228,150,.95)";
    g.beginPath();
    g.arc(p.x, p.y, dr * 0.55, 0, TAU);
    g.fill();
  }
  return { spr: { c, w: S, h: S }, tw: [pts[0], pts[Math.min(2, pts.length - 1)]] };
}

/* ═══════════ disposición ═══════════ */
export function layoutBouquet(W: number, H: number, M: number, q: number, rng: Rng, prev: Bouquet | null): Bouquet {
  const vert = H > W * 1.2;
  const cx = W / 2;
  const cy = vert ? H * 0.455 : H * 0.5;
  const R0 = M * (vert ? 0.158 : 0.105);
  const wx = cx;
  const wy = cy + 2.75 * R0;

  const heads: Head[] = HEADS_DEF.map((d, i) => {
    const R = d.r * R0;
    const pal = PALS[d.pal];
    return {
      x: cx + d.x * R0,
      y: cy + d.y * R0,
      R,
      cr: R * 0.58,
      dl: d.dl,
      rot: d.tilt * 0.16 + rng.range(-0.06, 0.06),
      sx: d.tilt !== 0 ? 0.94 : 1,
      sy: i === 0 ? 0.94 : 1,
      swayA: rng.range(0.012, 0.022),
      swayW: rng.range(0.3, 0.52),
      ph: rng.range(0, TAU),
      petalB: bakePetal(R, R * 0.34, R * 0.9, R * 0.3, pal.b0, pal.b1, q, false),
      petalF: bakePetal(R, R * 0.34, R * 1.05, R * 0.24, pal.f0, pal.f1, q, true),
      disc: bakeDisc(R * 0.58, q, rng),
      full: null,
    };
  });

  /* tallos: cuadrática cintura → base de la cabeza, más extensión recta bajo la cintura */
  const stemCols = ["#2f6e20", "#357a26", "#2a6420", "#3b8a2b"];
  /* desplazamiento de cada tallo en la cintura: manojo atado en espiral */
  const WAIST_OFF = [-0.06, 0.18, -0.2, 0.1, -0.14, 0.22, -0.24, 0.02, 0.14];
  const stems: Stem[] = heads.map((h, i) => {
    const p0 = { x: wx + WAIST_OFF[i % WAIST_OFF.length] * R0, y: wy };
    const B = { x: h.x, y: h.y + h.R * 0.35 };
    const C = { x: p0.x + (h.x - p0.x) * 0.3 + rng.range(-0.1, 0.1) * R0, y: wy - (wy - B.y) * 0.5 };
    const pts: Pt[] = [];
    const n = 16;
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      const it = 1 - u;
      pts.push({
        x: it * it * p0.x + 2 * it * u * C.x + u * u * B.x,
        y: it * it * p0.y + 2 * it * u * C.y + u * u * B.y,
      });
    }
    let dx = p0.x - C.x;
    let dy = p0.y - C.y;
    const L = Math.hypot(dx, dy) || 1;
    dx /= L;
    dy /= L;
    const ext = R0 * rng.range(0.78, 0.98);
    return {
      pts,
      p0,
      e: { x: p0.x + dx * ext, y: p0.y + dy * ext },
      w: R0 * (0.07 + 0.025 * (h.R / R0)),
      col: stemCols[i % stemCols.length],
    };
  });

  const BABY_POS: [number, number][] = [
    [-0.62, -1.55],
    [0.64, -1.52],
    [-1.68, -0.5],
    [1.7, -0.46],
    [-1.62, 0.98],
    [1.64, 1.0],
    [-0.55, 1.95],
    [0.57, 1.97],
    [-0.24, -2.1],
    [0.3, -2.14],
  ];
  const babies: Baby[] = BABY_POS.map((p) => {
    const b = bakeBaby(R0, q, rng);
    return { x: cx + p[0] * R0, y: cy + p[1] * R0, spr: b.spr, tw: b.tw, ph: rng.range(0, TAU) };
  });

  const sparkles: Sparkle[] = [];
  for (let i = 0; i < 7; i++) sparkles.push({ ph: rng.range(0, 10), seed: rng.range(1, 99) });

  const maxDl = HEADS_DEF.reduce((m, d) => Math.max(m, d.dl), 0);
  const tb: Timeline = {
    stemStart: 0.3,
    stemDur: 1.2,
    headBase: 1.45,
    bud: 0.4,
    petals: 1.5,
    seeds: 0.9,
    ribbonStart: 1.7,
    ribbonDur: 0.7,
    burstAt: 0,
    textAt: 0,
  };
  tb.burstAt = tb.headBase + maxDl + 0.3 + tb.petals + tb.seeds + 0.25;
  tb.textAt = tb.burstAt + 0.4;

  return {
    cx,
    cy,
    R0,
    wx,
    wy,
    q,
    heads,
    stems,
    babies,
    sparkles,
    statik: null,
    statX: 0,
    statY: 0,
    burstDone: prev ? prev.burstDone : false,
    lastHeart: prev ? prev.lastHeart : 0,
    tb,
  };
}

export function bloomOf(bq: Bouquet, t: number): number {
  return easeInOutCubic(clamp((t - bq.tb.stemStart) / (bq.tb.burstAt - bq.tb.stemStart), 0, 1));
}

/* ═══════════ tallos ═══════════ */
function stemPath(g: Ctx, s: Stem, pTop: number, pBot: number, ox: number): void {
  g.beginPath();
  const n = s.pts.length - 1;
  const upto = pTop * n;
  const iEnd = Math.floor(upto);
  g.moveTo(s.pts[0].x + ox, s.pts[0].y);
  for (let i = 1; i <= iEnd && i <= n; i++) g.lineTo(s.pts[i].x + ox, s.pts[i].y);
  if (iEnd < n) {
    const f = upto - iEnd;
    const a = s.pts[iEnd];
    const b = s.pts[iEnd + 1];
    g.lineTo(lerp(a.x, b.x, f) + ox, lerp(a.y, b.y, f));
  }
  if (pBot > 0) {
    g.moveTo(s.p0.x + ox, s.p0.y);
    g.lineTo(lerp(s.p0.x, s.e.x, pBot) + ox, lerp(s.p0.y, s.e.y, pBot));
  }
}
function drawStem(g: Ctx, s: Stem, pTop: number, pBot: number): void {
  if (pTop <= 0) return;
  g.lineCap = "round";
  g.lineJoin = "round";
  stemPath(g, s, pTop, pBot, 0);
  g.strokeStyle = "#163a0e";
  g.lineWidth = s.w + 2;
  g.stroke();
  g.strokeStyle = s.col;
  g.lineWidth = s.w;
  g.stroke();
  stemPath(g, s, pTop, pBot, -s.w * 0.22);
  g.strokeStyle = "rgba(175,235,125,.3)";
  g.lineWidth = s.w * 0.26;
  g.stroke();
  if (pBot >= 1) {
    g.fillStyle = "#a6d98a";
    g.beginPath();
    g.arc(s.e.x, s.e.y, s.w * 0.42, 0, TAU);
    g.fill();
  }
}

/* ═══════════ listón y moño (origen en la cintura) ═══════════ */
function loopPath(g: Ctx, sd: number, L: number): void {
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(sd * L * 0.2, -L * 0.7, sd * L * 1.2, -L * 0.72, sd * L * 1.12, -L * 0.14);
  g.bezierCurveTo(sd * L * 1.06, L * 0.3, sd * L * 0.42, L * 0.3, 0, 0);
  g.closePath();
}
function tailPath(g: Ctx, sd: number, R0: number): void {
  const tw = 0.17 * R0;
  const tl = 1.15 * R0;
  const ex = sd * 0.3 * R0;
  g.beginPath();
  g.moveTo(sd * 0.03 * R0, 0.02 * R0);
  g.bezierCurveTo(sd * 0.12 * R0, tl * 0.4, ex - sd * tw * 0.2, tl * 0.62, ex + sd * tw * 0.5, tl);
  g.lineTo(ex, tl - 0.13 * R0);
  g.lineTo(ex - sd * tw * 0.5, tl - 0.02 * R0);
  g.bezierCurveTo(ex - sd * tw * 0.8, tl * 0.62, -sd * 0.06 * R0, tl * 0.4, -sd * 0.12 * R0, 0.02 * R0);
  g.closePath();
}
function drawRibbon(g: Ctx, R0: number, p: number, bowP: number): void {
  if (p <= 0) return;
  const bw = 0.36 * R0;
  const bh = 0.16 * R0;
  const e = easeOutCubic(p);
  g.save();
  g.beginPath();
  g.rect(-bw - 3, -bh - 0.1 * R0, (2 * bw + 6) * e, 2 * bh + 0.2 * R0);
  g.clip();
  const bg = g.createLinearGradient(-bw, 0, bw, 0);
  bg.addColorStop(0, RIB.dark);
  bg.addColorStop(0.3, RIB.base);
  bg.addColorStop(0.55, RIB.light);
  bg.addColorStop(0.8, RIB.base);
  bg.addColorStop(1, RIB.dark);
  g.fillStyle = bg;
  g.beginPath();
  g.moveTo(-bw, -bh);
  g.quadraticCurveTo(0, -bh - 0.06 * R0, bw, -bh);
  g.lineTo(bw, bh);
  g.quadraticCurveTo(0, bh + 0.06 * R0, -bw, bh);
  g.closePath();
  g.fill();
  g.strokeStyle = RIB.edge;
  g.lineWidth = 1;
  g.stroke();
  g.restore();

  if (bowP <= 0) return;
  const s = easeOutBack(bowP);
  g.save();
  g.translate(0, -0.02 * R0);
  g.scale(s, s);
  g.lineJoin = "round";

  /* colas */
  for (const sd of [-1, 1]) {
    tailPath(g, sd, R0);
    const tg = g.createLinearGradient(0, 0, 0, 1.15 * R0);
    tg.addColorStop(0, RIB.dark);
    tg.addColorStop(0.45, RIB.base);
    tg.addColorStop(1, RIB.light);
    g.fillStyle = tg;
    g.fill();
    g.strokeStyle = RIB.edge;
    g.lineWidth = 1;
    g.stroke();
    g.strokeStyle = RIB.sheen;
    g.lineWidth = Math.max(1, R0 * 0.022);
    g.beginPath();
    g.moveTo(-sd * 0.02 * R0, 0.12 * R0);
    g.quadraticCurveTo(sd * 0.06 * R0, 0.55 * R0, sd * 0.24 * R0, 0.95 * R0);
    g.stroke();
  }
  /* lazos */
  const L = 0.62 * R0;
  for (const sd of [-1, 1]) {
    loopPath(g, sd, L);
    const lg = g.createLinearGradient(0, 0, sd * L, -L * 0.4);
    lg.addColorStop(0, RIB.dark);
    lg.addColorStop(0.45, RIB.base);
    lg.addColorStop(0.75, RIB.light);
    lg.addColorStop(1, RIB.base);
    g.fillStyle = lg;
    g.fill();
    g.strokeStyle = RIB.edge;
    g.lineWidth = 1.2;
    g.stroke();
    /* hueco del lazo */
    g.save();
    g.translate(sd * L * 0.66, -L * 0.2);
    g.scale(0.42, 0.42);
    g.translate(-sd * L * 0.66, L * 0.2);
    loopPath(g, sd, L);
    g.fillStyle = "rgba(70,5,25,.55)";
    g.fill();
    g.restore();
    /* brillo satinado */
    g.strokeStyle = RIB.sheen;
    g.lineWidth = Math.max(1.2, R0 * 0.03);
    g.beginPath();
    g.moveTo(sd * L * 0.2, -L * 0.32);
    g.quadraticCurveTo(sd * L * 0.6, -L * 0.52, sd * L * 0.98, -L * 0.3);
    g.stroke();
  }
  /* nudo */
  const kg = g.createRadialGradient(-R0 * 0.04, -R0 * 0.05, R0 * 0.01, 0, 0, R0 * 0.17);
  kg.addColorStop(0, "#ff9fb4");
  kg.addColorStop(0.5, "#d94868");
  kg.addColorStop(1, "#7a1129");
  g.fillStyle = kg;
  g.beginPath();
  if (typeof g.roundRect === "function") {
    g.roundRect(-0.13 * R0, -0.11 * R0, 0.26 * R0, 0.22 * R0, 0.05 * R0);
  } else {
    g.ellipse(0, 0, 0.14 * R0, 0.12 * R0, 0, 0, TAU);
  }
  g.fill();
  g.strokeStyle = RIB.edge;
  g.lineWidth = 1;
  g.stroke();
  g.restore();
}

/* ═══════════ capa estática (tallos + listón) ═══════════ */
function drawStaticParts(g: Ctx, bq: Bouquet, t: number): void {
  const tb = bq.tb;
  const R0 = bq.R0;
  bq.stems.forEach((s, i) => {
    const pTop = easeInOutCubic(clamp((t - (tb.stemStart + i * 0.05)) / tb.stemDur, 0, 1));
    const pBot = easeOutCubic(clamp((t - (tb.stemStart + 0.55 + i * 0.05)) / 0.7, 0, 1));
    drawStem(g, s, pTop, pBot);
  });
  const rp = clamp((t - tb.ribbonStart) / tb.ribbonDur, 0, 1);
  const bp = clamp((t - (tb.ribbonStart + 0.45)) / 0.65, 0, 1);
  if (rp > 0) {
    g.save();
    g.translate(bq.wx, bq.wy);
    drawRibbon(g, R0, rp, bp);
    g.restore();
  }
}
function bakeStatic(bq: Bouquet): void {
  const R0 = bq.R0;
  const x0 = bq.cx - 2.95 * R0;
  const y0 = bq.cy - 2.95 * R0;
  const w = 5.9 * R0;
  const h = 7.4 * R0;
  const { c, g } = makeCanvas(w * bq.q, h * bq.q);
  g.scale(bq.q, bq.q);
  g.translate(-x0, -y0);
  drawStaticParts(g, bq, 1e9);
  bq.statik = { c, w, h };
  bq.statX = x0;
  bq.statY = y0;
}

/* ═══════════ cabeza en el mundo ═══════════ */
function drawHead(g: Ctx, h: Head, t: number, bud: number, petB: number, seed: number, motion: number): void {
  const R = h.R;
  const S = glowSprites();
  const sway = Math.sin(t * h.swayW + h.ph) * h.swayA * motion;
  const pulse = 0.85 + 0.15 * Math.sin(t * 1.8 + h.ph * 1.3);
  const gA = (0.06 + 0.16 * Math.max(petB, seed * 0.6)) * pulse * Math.min(1, bud);
  g.globalCompositeOperation = "lighter";
  glowAt(g, h.x, h.y, R * 4.2, gA * 0.9, S.AMBER);
  glowAt(g, h.x, h.y, R * 2.3, gA, S.GOLD);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;

  g.save();
  g.translate(h.x, h.y + R * 0.5);
  g.rotate(h.rot + sway);
  g.translate(0, -R * 0.5);
  g.scale(h.sx, h.sy);
  if (h.full) g.drawImage(h.full.c, -h.full.w / 2, -h.full.h / 2, h.full.w, h.full.h);
  else drawHeadLive(g, h, bud, petB, seed);
  g.restore();
}

function drawBabies(g: Ctx, bq: Bouquet, p: number, t: number): void {
  const WHITE = glowSprites().WHITE;
  const R0 = bq.R0;
  g.globalCompositeOperation = "lighter";
  for (const b of bq.babies) {
    g.globalAlpha = p * (0.8 + 0.2 * Math.sin(t * 1.5 + b.ph));
    g.drawImage(b.spr.c, b.x - b.spr.w / 2, b.y - b.spr.h / 2, b.spr.w, b.spr.h);
    for (let i = 0; i < b.tw.length; i++) {
      const a = p * Math.pow(0.5 + 0.5 * Math.sin(t * 2.4 + b.ph + i * 2.1), 3);
      const sz = R0 * 0.22;
      g.globalAlpha = a * 0.9;
      g.drawImage(WHITE, b.x + b.tw[i].x - sz / 2, b.y + b.tw[i].y - sz / 2, sz, sz);
    }
  }
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
}

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
function drawSparkles(g: Ctx, bq: Bouquet, t: number): void {
  const WHITE = glowSprites().WHITE;
  const R0 = bq.R0;
  g.globalCompositeOperation = "lighter";
  for (const s of bq.sparkles) {
    const ph = t * 0.42 + s.ph;
    const cyc = Math.floor(ph);
    const frac = ph - cyc;
    const a = Math.pow(Math.sin(frac * Math.PI), 2);
    if (a < 0.02) continue;
    const h = bq.heads[Math.floor(hash(cyc * 3.1 + s.seed) * bq.heads.length)];
    const ang = hash(cyc * 7.7 + s.seed) * TAU;
    const rr = h.R * 0.92 * Math.sqrt(hash(cyc * 5.3 + s.seed));
    const x = h.x + Math.cos(ang) * rr;
    const y = h.y + Math.sin(ang) * rr;
    const sz = R0 * 0.36 * (0.6 + 0.4 * a);
    g.globalAlpha = a * 0.85;
    g.drawImage(WHITE, x - sz / 2, y - sz / 2, sz, sz);
    const L = R0 * 0.11 * a;
    g.strokeStyle = "rgba(255,255,245,.95)";
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x - L, y);
    g.lineTo(x + L, y);
    g.moveTo(x, y - L);
    g.lineTo(x, y + L);
    g.stroke();
  }
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
}

function drawBurstRings(g: Ctx, x: number, y: number, bp: number, M: number): void {
  if (bp >= 1.6) return;
  const R = M * 0.15;
  const e = easeOutCubic(clamp(bp / 1.1, 0, 1));
  const a1 = clamp(1 - bp / 1.1, 0, 1);
  g.globalCompositeOperation = "lighter";
  g.strokeStyle = `rgba(255,224,150,${a1 * 0.8})`;
  g.lineWidth = lerp(10, 1, e);
  g.beginPath();
  g.arc(x, y, R * 0.5 + e * R * 4.0, 0, TAU);
  g.stroke();
  const e2 = easeOutCubic(clamp((bp - 0.15) / 1.3, 0, 1));
  const a2 = clamp(1 - (bp - 0.15) / 1.3, 0, 1);
  if (a2 > 0) {
    g.strokeStyle = `rgba(255,200,110,${a2 * 0.5})`;
    g.lineWidth = lerp(6, 1, e2);
    g.beginPath();
    g.arc(x, y, R * 0.4 + e2 * R * 2.8, 0, TAU);
    g.stroke();
  }
  if (bp < 0.45) {
    g.globalAlpha = (1 - bp / 0.45) * 0.32;
    g.drawImage(glowSprites().WARM, x - R * 4, y - R * 4, R * 8, R * 8);
  }
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
}

/* ═══════════ dibujo principal ═══════════ */
export function drawBouquet(g: Ctx, bq: Bouquet, t: number, motion: number, parts: Particles, M: number): void {
  const tb = bq.tb;
  if (t <= tb.stemStart) return;
  const { cx, cy, R0 } = bq;
  const bloom = bloomOf(bq, t);
  const S = glowSprites();

  /* halo general */
  g.globalCompositeOperation = "lighter";
  const pulse = 0.86 + 0.14 * Math.sin(t * 1.7);
  glowAt(g, cx, cy - 0.2 * R0, R0 * 9, (0.05 + bloom * 0.09) * pulse, S.AMBER);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;

  /* tallos, hojas, listón */
  if (!bq.statik && t > tb.burstAt) bakeStatic(bq);
  if (bq.statik) g.drawImage(bq.statik.c, bq.statX, bq.statY, bq.statik.w, bq.statik.h);
  else drawStaticParts(g, bq, t);

  /* flores */
  for (const h of bq.heads) {
    const t0 = tb.headBase + h.dl;
    const bud = easeOutBack(clamp((t - t0) / tb.bud, 0, 1));
    if (bud <= 0) continue;
    const petB = clamp((t - (t0 + 0.3)) / tb.petals, 0, 1);
    const seed = clamp((t - (t0 + 0.3 + tb.petals)) / tb.seeds, 0, 1);
    if (!h.full && petB >= 1 && seed >= 1) bakeFull(h, bq.q);
    drawHead(g, h, t, bud, petB, seed, motion);
  }

  /* florecillas blancas */
  const babP = easeOutCubic(clamp((t - (tb.burstAt - 1.0)) / 0.9, 0, 1));
  if (babP > 0) drawBabies(g, bq, babP, t);

  /* clímax */
  const bp = t - tb.burstAt;
  if (bp >= 0) {
    const scale = Math.max(0.6, M / 1000);
    if (!bq.burstDone) {
      bq.burstDone = true;
      bq.lastHeart = t;
      parts.burst(cx, cy - 0.1 * R0, scale);
    }
    drawBurstRings(g, cx, cy - 0.1 * R0, bp, M);
    if (motion > 0.5) drawSparkles(g, bq, t);
    if (bp > 0.8 && motion > 0.5 && t - bq.lastHeart > 2.4) {
      bq.lastHeart = t;
      const h = bq.heads[Math.floor(Math.random() * bq.heads.length)];
      parts.riseHeart(h.x + (Math.random() - 0.5) * h.R, h.y - h.R * 0.7, (0.55 + Math.random() * 0.4) * scale);
    }
  }
}
