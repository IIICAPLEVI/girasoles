/* ───────────────────────── fondo, estrellas, luciérnagas, polen ───────────────────────── */
import type { Ctx, Rng } from "./utils";
import { TAU, makeCanvas, glowSprites, glowAt } from "./utils";

interface Star {
  x: number;
  y: number;
  r: number;
  sp: number;
  ph: number;
  warm: boolean;
}
interface Firefly {
  x: number;
  y: number;
  a1: number;
  a2: number;
  p1: number;
  p2: number;
  sp: number;
  ph: number;
}
interface Pollen {
  x: number;
  y: number;
  r: number;
  ph: number;
  vy: number;
  sp: number;
}
interface Shoot {
  x: number;
  y: number;
  dx: number;
  dy: number;
  p: number;
}

export interface Ambient {
  bg: HTMLCanvasElement;
  stars: Star[];
  fireflies: Firefly[];
  pollen: Pollen[];
  shoot: Shoot | null;
  nextShoot: number;
}

export function buildAmbient(W: number, H: number, M: number, q: number, rng: Rng, low: boolean): Ambient {
  const S = glowSprites();

  /* ---- fondo estático horneado ---- */
  const { c: bg, g } = makeCanvas(W * q, H * q);
  g.scale(q, q);
  g.fillStyle = "#030308";
  g.fillRect(0, 0, W, H);

  /* cielo: leve degradado azul-noche arriba */
  const sky = g.createLinearGradient(0, 0, 0, H * 0.6);
  sky.addColorStop(0, "rgba(22,18,52,.55)");
  sky.addColorStop(1, "rgba(22,18,52,0)");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H * 0.6);

  g.globalCompositeOperation = "lighter";
  glowAt(g, W * 0.18, H * 0.16, M * 1.0, 0.07, S.VIOLET);
  glowAt(g, W * 0.84, H * 0.1, M * 0.8, 0.06, S.VIOLET);
  glowAt(g, W * 0.5, H * 0.95, M * 1.6, 0.05, S.AMBER);

  /* estrellas fijas */
  const nStatic = low ? 90 : 170;
  for (let i = 0; i < nStatic; i++) {
    const x = rng.range(0, W);
    const y = rng.range(0, H * 0.62) * (0.3 + 0.7 * rng.next());
    const r = rng.range(0.4, 1.3);
    const a = rng.range(0.25, 0.7) * (1 - (y / H) * 0.8);
    g.globalAlpha = a;
    const sz = r * 9;
    g.drawImage(rng.chance(0.35) ? S.WARM : S.WHITE, x - sz / 2, y - sz / 2, sz, sz);
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";

  /* suelo: penumbra verdosa */
  const gr = g.createLinearGradient(0, H * 0.45, 0, H);
  gr.addColorStop(0, "rgba(14,24,8,0)");
  gr.addColorStop(1, "rgba(14,24,8,0.55)");
  g.fillStyle = gr;
  g.fillRect(0, H * 0.45, W, H * 0.55);

  /* ---- partículas animadas ---- */
  const stars: Star[] = [];
  const nTw = low ? 30 : 55;
  for (let i = 0; i < nTw; i++) {
    stars.push({
      x: rng.range(0, W),
      y: rng.range(0, H * 0.55),
      r: rng.range(0.7, 1.7),
      sp: rng.range(0.4, 1.6),
      ph: rng.range(0, TAU),
      warm: rng.chance(0.35),
    });
  }
  const fireflies: Firefly[] = [];
  const nF = low ? 7 : 13;
  for (let i = 0; i < nF; i++) {
    fireflies.push({
      x: rng.range(0, W),
      y: rng.range(H * 0.3, H * 0.85),
      a1: rng.range(0.3, 1.2),
      a2: rng.range(0.3, 1.2),
      p1: rng.range(0, TAU),
      p2: rng.range(0, TAU),
      sp: rng.range(0.8, 2.0),
      ph: rng.range(0, TAU),
    });
  }
  const pollen: Pollen[] = [];
  const nP = low ? 16 : 34;
  for (let i = 0; i < nP; i++) {
    pollen.push({
      x: rng.range(0, W),
      y: rng.range(0, H * 0.95),
      r: rng.range(0.7, 1.8),
      ph: rng.range(0, TAU),
      vy: rng.range(-14, -4),
      sp: rng.range(0.6, 1.6),
    });
  }
  return { bg, stars, fireflies, pollen, shoot: null, nextShoot: rng.range(5, 9) };
}

export function drawBackground(g: Ctx, amb: Ambient, W: number, H: number, M: number, bloom: number, at: number): void {
  g.drawImage(amb.bg, 0, 0, W, H);
  const S = glowSprites();
  g.globalCompositeOperation = "lighter";
  const pulse = 0.9 + 0.1 * Math.sin(at * 0.9);
  glowAt(g, W / 2, H * 0.42, M * 1.35, (0.04 + bloom * 0.09) * pulse, S.AMBER);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
}

export function drawStars(g: Ctx, amb: Ambient, at: number): void {
  const S = glowSprites();
  g.globalCompositeOperation = "lighter";
  for (const s of amb.stars) {
    const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(at * s.sp + s.ph));
    g.globalAlpha = tw * 0.8;
    const sz = s.r * 11;
    g.drawImage(s.warm ? S.WARM : S.WHITE, s.x - sz / 2, s.y - sz / 2, sz, sz);
  }
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
}

export function drawShoot(g: Ctx, amb: Ambient, W: number, H: number, dt: number, reduced: boolean): void {
  if (reduced) return;
  if (!amb.shoot) {
    amb.nextShoot -= dt;
    if (amb.nextShoot <= 0) {
      amb.shoot = {
        x: W * (0.08 + Math.random() * 0.64),
        y: H * (0.04 + Math.random() * 0.18),
        dx: W * (0.14 + Math.random() * 0.16),
        dy: H * (0.05 + Math.random() * 0.06),
        p: 0,
      };
    }
    return;
  }
  const sh = amb.shoot;
  sh.p += dt / 0.85;
  if (sh.p >= 1) {
    amb.shoot = null;
    amb.nextShoot = 8 + Math.random() * 9;
    return;
  }
  const e = sh.p;
  const px = sh.x + sh.dx * e;
  const py = sh.y + sh.dy * e;
  const tx = sh.x + sh.dx * Math.max(0, e - 0.16);
  const ty = sh.y + sh.dy * Math.max(0, e - 0.16);
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = Math.sin(e * Math.PI);
  const gr = g.createLinearGradient(tx, ty, px, py);
  gr.addColorStop(0, "rgba(255,255,255,0)");
  gr.addColorStop(1, "rgba(255,250,230,.95)");
  g.strokeStyle = gr;
  g.lineWidth = 1.8;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(tx, ty);
  g.lineTo(px, py);
  g.stroke();
  glowAt(g, px, py, 26, 0.9, glowSprites().WHITE);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
}

export function drawFireflies(g: Ctx, amb: Ambient, W: number, H: number, M: number, at: number, dt: number): void {
  const GOLD = glowSprites().GOLD;
  g.globalCompositeOperation = "lighter";
  for (const f of amb.fireflies) {
    f.x += Math.cos(at * f.a1 + f.p1) * 26 * dt;
    f.y += Math.sin(at * f.a2 + f.p2) * 20 * dt;
    if (f.x < -30) f.x = W + 20;
    if (f.x > W + 30) f.x = -20;
    if (f.y < H * 0.25) f.y = H * 0.25;
    if (f.y > H * 0.9) f.y = H * 0.9;
    const pu = 0.5 + 0.5 * Math.sin(at * f.sp + f.ph);
    const a = pu * pu;
    g.globalAlpha = a * 0.75;
    const sz = M * (0.014 + 0.022 * pu);
    g.drawImage(GOLD, f.x - sz / 2, f.y - sz / 2, sz, sz);
    g.globalAlpha = a;
    g.fillStyle = "rgba(255,244,200,1)";
    g.beginPath();
    g.arc(f.x, f.y, 1.5, 0, TAU);
    g.fill();
  }
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
}

export function drawPollen(g: Ctx, amb: Ambient, W: number, H: number, at: number, dt: number): void {
  const GOLD = glowSprites().GOLD;
  g.globalCompositeOperation = "lighter";
  for (const p of amb.pollen) {
    p.y += p.vy * dt;
    p.x += Math.sin(at * p.sp + p.ph) * 14 * dt;
    if (p.y < -8) {
      p.y = H + 8;
      p.x = Math.random() * W;
    }
    g.globalAlpha = 0.16 + 0.3 * (0.5 + 0.5 * Math.sin(at * 2.1 + p.ph * 2));
    const sz = p.r * 9;
    g.drawImage(GOLD, p.x - sz / 2, p.y - sz / 2, sz, sz);
  }
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
}
