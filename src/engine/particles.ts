/* ───────────────────────── corazones, chispas y ondas ─────────────────────────
   Todo el brillo se hornea una sola vez en sprites; en el bucle sólo hay
   drawImage con una transformación directa (sin save/restore ni shadowBlur). */
import type { Ctx } from "./utils";
import { TAU, easeOutCubic, heartPath, makeCanvas, glowSprites, xform, resetXform } from "./utils";

interface HeartP {
  type: "heart";
  spr: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  s: number;
  rot: number;
  vr: number;
  ph: number;
  rising: boolean;
}
interface SparkP {
  type: "spark";
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  sz: number;
}
interface RingP {
  type: "ring";
  x: number;
  y: number;
  age: number;
  life: number;
}
type Part = HeartP | SparkP | RingP;

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

function makeHeartSprite(col: string, rgb: string): HTMLCanvasElement {
  const s = 96;
  const { c, g } = makeCanvas(s, s);
  g.globalCompositeOperation = "lighter";
  const gr = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
  gr.addColorStop(0, `rgba(${rgb},.55)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = "source-over";
  g.translate(s / 2, s / 2);
  g.fillStyle = col;
  heartPath(g, s * 0.34);
  g.fill();
  g.fillStyle = "rgba(255,255,255,.35)";
  g.beginPath();
  g.ellipse(-s * 0.1, -s * 0.1, s * 0.055, s * 0.032, -0.6, 0, TAU);
  g.fill();
  return c;
}
const HEART_DEFS: [string, string][] = [
  ["#ff7fae", "255,140,180"],
  ["#ffb0c8", "255,170,205"],
  ["#ff6f9c", "255,120,165"],
  ["#ffd76a", "255,205,120"],
  ["#ff9d6b", "255,175,130"],
];

export class Particles {
  private parts: Part[] = [];
  private sprites: HTMLCanvasElement[] = HEART_DEFS.map((d) => makeHeartSprite(d[0], d[1]));
  private max: number;
  private lastTap = -1;

  constructor(max = 220) {
    this.max = max;
  }

  get count(): number {
    return this.parts.length;
  }

  setMax(n: number): void {
    this.max = n;
  }

  private add(p: Part): void {
    if (this.parts.length >= this.max) {
      /* descarta las más viejas primero */
      this.parts.splice(0, this.parts.length - this.max + 1);
    }
    this.parts.push(p);
  }

  private heart(x: number, y: number, scale: number, rising: boolean): HeartP {
    const a = rnd(-Math.PI * 0.85, -Math.PI * 0.15);
    const sp = rnd(50, 190);
    return {
      type: "heart",
      spr: Math.floor(Math.random() * this.sprites.length),
      x,
      y,
      vx: rising ? rnd(-10, 10) : Math.cos(a) * sp,
      vy: rising ? rnd(-70, -40) : Math.sin(a) * sp,
      age: 0,
      life: rising ? rnd(2.6, 3.8) : rnd(1.3, 2.1),
      s: rnd(8, 16) * scale,
      rot: rnd(-0.5, 0.5),
      vr: rnd(-1.2, 1.2),
      ph: rnd(0, TAU),
      rising,
    };
  }

  /** corazón que sube lentamente desde una flor */
  riseHeart(x: number, y: number, scale: number): void {
    this.add(this.heart(x, y, scale, true));
  }

  /** ráfaga al tocar la pantalla (con límite de frecuencia) */
  tap(x: number, y: number, scale: number, reduced: boolean, now: number): boolean {
    if (now - this.lastTap < 0.09) return false;
    this.lastTap = now;
    const n = reduced ? 6 : 9 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) this.add(this.heart(x, y, scale, false));
    const ns = reduced ? 4 : 8;
    for (let i = 0; i < ns; i++) {
      const a = rnd(0, TAU);
      const sp = rnd(30, 110);
      this.add({
        type: "spark",
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        age: 0,
        life: rnd(0.5, 0.9),
        sz: rnd(8, 16),
      });
    }
    this.add({ type: "ring", x, y, age: 0, life: 0.7 });
    return true;
  }

  /** chispita al mover el puntero */
  trail(x: number, y: number): void {
    if (this.parts.length > 140) return;
    this.add({
      type: "spark",
      x,
      y,
      vx: rnd(-8, 8),
      vy: rnd(-30, -12),
      age: 0,
      life: rnd(0.5, 1),
      sz: rnd(6, 12),
    });
  }

  /** gran estallido al terminar el ramo */
  burst(x: number, y: number, scale: number): void {
    for (let i = 0; i < 30; i++) {
      const a = rnd(0, TAU);
      const sp = rnd(60, 230);
      this.add({
        type: "spark",
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        age: 0,
        life: rnd(0.7, 1.4),
        sz: rnd(14, 30),
      });
    }
    for (let i = 0; i < 14; i++) {
      const h = this.heart(x, y, scale, false);
      h.life = rnd(1.6, 2.6);
      h.s = rnd(10, 18) * scale;
      this.add(h);
    }
  }

  draw(g: Ctx, dpr: number, dt: number): void {
    const parts = this.parts;
    if (!parts.length) return;
    const GOLD = glowSprites().GOLD;
    g.globalCompositeOperation = "lighter";
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) {
        parts[i] = parts[parts.length - 1];
        parts.pop();
        continue;
      }
      const u = p.age / p.life;
      const fade = 1 - u;
      if (p.type === "spark") {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const dmp = Math.max(0, 1 - 1.4 * dt);
        p.vx *= dmp;
        p.vy *= dmp;
        const s = p.sz * (0.5 + 0.5 * fade);
        g.globalAlpha = fade * 0.55;
        g.drawImage(GOLD, p.x - s / 2, p.y - s / 2, s, s);
      } else if (p.type === "ring") {
        const e = easeOutCubic(u);
        g.globalAlpha = fade * 0.5;
        g.strokeStyle = "rgba(255,214,130,1)";
        g.lineWidth = 2.5 * fade + 0.5;
        g.beginPath();
        g.arc(p.x, p.y, 8 + e * 70, 0, TAU);
        g.stroke();
      } else {
        p.vy += (p.rising ? 10 : 26) * dt;
        p.vx *= Math.max(0, 1 - 1.2 * dt);
        p.x += p.vx * dt + Math.sin(p.age * 5 + p.ph) * 16 * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const d = p.s * 1.4 * (1 + u * 0.15);
        xform(g, dpr, p.x, p.y, p.rot);
        g.globalAlpha = Math.min(1, fade * 1.4);
        g.drawImage(this.sprites[p.spr], -d, -d, d * 2, d * 2);
        resetXform(g, dpr);
      }
    }
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
  }
}
