/* ───────────────────────── utilidades compartidas del motor ───────────────────────── */

export const TAU = Math.PI * 2;
/** ángulo dorado: espiral de semillas del girasol */
export const GA = Math.PI * (3 - Math.sqrt(5));

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3);
export const easeOutQuad = (x: number): number => 1 - (1 - x) * (1 - x);
export const easeInOutCubic = (x: number): number =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const easeOutBack = (x: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export const REDUCED: boolean =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const IS_TOUCH: boolean =
  typeof window !== "undefined" &&
  (navigator.maxTouchPoints > 0 || "ontouchstart" in window);

export type Ctx = CanvasRenderingContext2D;

export interface Img {
  c: HTMLCanvasElement;
  w: number;
  h: number;
}

export interface Pt {
  x: number;
  y: number;
}

/* ---------- RNG determinista (mulberry32) ----------
   Con semilla fija, el campo y el ramo se ven igual aunque el
   navegador dispare "resize" (barra de direcciones en el celular). */
export interface Rng {
  next(): number;
  range(lo: number, hi: number): number;
  int(n: number): number;
  chance(p: number): boolean;
}
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo, hi) => lo + next() * (hi - lo),
    int: (n) => Math.floor(next() * n),
    chance: (p) => next() < p,
  };
}

export function makeCanvas(w: number, h: number): { c: HTMLCanvasElement; g: Ctx } {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const g = c.getContext("2d") as Ctx;
  return { c, g };
}

/* ---------- sprites de brillo (se dibujan con drawImage, nada de shadowBlur) ---------- */
function makeGlow(r: number, gr: number, b: number): HTMLCanvasElement {
  const s = 128;
  const { c, g } = makeCanvas(s, s);
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, `rgba(${r},${gr},${b},1)`);
  grad.addColorStop(0.2, `rgba(${r},${gr},${b},0.45)`);
  grad.addColorStop(0.5, `rgba(${r},${gr},${b},0.12)`);
  grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  return c;
}

export interface GlowSprites {
  GOLD: HTMLCanvasElement;
  AMBER: HTMLCanvasElement;
  WHITE: HTMLCanvasElement;
  WARM: HTMLCanvasElement;
  VIOLET: HTMLCanvasElement;
  ROSE: HTMLCanvasElement;
}
let glowCache: GlowSprites | null = null;
export function glowSprites(): GlowSprites {
  if (!glowCache) {
    glowCache = {
      GOLD: makeGlow(255, 198, 92),
      AMBER: makeGlow(255, 168, 64),
      WHITE: makeGlow(210, 222, 255),
      WARM: makeGlow(255, 228, 178),
      VIOLET: makeGlow(120, 100, 214),
      ROSE: makeGlow(255, 150, 185),
    };
  }
  return glowCache;
}

export function glowAt(g: Ctx, x: number, y: number, s: number, a: number, spr: HTMLCanvasElement): void {
  g.globalAlpha = a;
  g.drawImage(spr, x - s / 2, y - s / 2, s, s);
}

/** transformación directa (más barata que save/translate/rotate/restore) */
export function xform(g: Ctx, dpr: number, x: number, y: number, rot: number, sx = 1, sy = sx): void {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  g.setTransform(dpr * c * sx, dpr * s * sx, -dpr * s * sy, dpr * c * sy, dpr * x, dpr * y);
}
export function resetXform(g: Ctx, dpr: number): void {
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ---------- formas ---------- */
/** pétalo apuntando hacia arriba, base en -r0 y punta en -r1 */
export function petalPath(g: Ctx, r0: number, r1: number, w: number): void {
  const L = r1 - r0;
  g.beginPath();
  g.moveTo(0, -r0);
  g.bezierCurveTo(w, -(r0 + L * 0.3), w * 0.8, -(r0 + L * 0.8), 0, -r1);
  g.bezierCurveTo(-w * 0.8, -(r0 + L * 0.8), -w, -(r0 + L * 0.3), 0, -r0);
  g.closePath();
}

/** hoja ancha de girasol, base en (0,0) y punta en (len,0) */
export function leafPath(g: Ctx, len: number, wf = 0.34): void {
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(len * 0.1, -len * wf * 1.15, len * 0.62, -len * wf, len, 0);
  g.bezierCurveTo(len * 0.62, len * wf, len * 0.1, len * wf * 1.15, 0, 0);
  g.closePath();
}

export function heartPath(g: Ctx, s: number): void {
  g.beginPath();
  g.moveTo(0, -s * 0.28);
  g.bezierCurveTo(-s * 0.42, -s * 0.62, -s * 0.98, -s * 0.18, 0, s * 0.52);
  g.bezierCurveTo(s * 0.98, -s * 0.18, s * 0.42, -s * 0.62, 0, -s * 0.28);
  g.closePath();
}
