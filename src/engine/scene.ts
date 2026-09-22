/* ───────────────────────── escena: bucle principal y estado ───────────────────────── */
import type { Ctx, Img } from "./utils";
import { IS_TOUCH, REDUCED, makeRng, resetXform } from "./utils";
import { buildField, drawField } from "./field";
import type { FieldFlower } from "./field";
import { buildAmbient, drawBackground, drawStars, drawShoot, drawFireflies, drawPollen } from "./ambient";
import type { Ambient } from "./ambient";
import { layoutBouquet, drawBouquet, bloomOf } from "./bouquet";
import type { Bouquet } from "./bouquet";
import { Particles } from "./particles";
import { bakeText, drawText } from "./text";
import type { Messages } from "./text";

export interface SceneOptions {
  messages: Messages;
  onInteract?: () => void;
}
export interface Scene {
  start(): void;
  destroy(): void;
}

export function createScene(canvas: HTMLCanvasElement, opts: SceneOptions): Scene {
  const ctx = canvas.getContext("2d", { alpha: false }) as Ctx;
  const motion = REDUCED ? 0.3 : 1;

  let W = 0;
  let H = 0;
  let M = 0;
  let DPR = 1;
  let q = 1;
  let dprCap = IS_TOUCH ? 1.5 : 2;

  let phase: "letter" | "field" = "letter";
  let animT = 0;
  let field: FieldFlower[] = [];
  let bq: Bouquet | null = null;
  let amb: Ambient | null = null;
  let textSpr: Img | null = null;
  let textDirty = true;
  const parts = new Particles(IS_TOUCH ? 160 : 220);

  /* pre-carga de fuentes para el texto del canvas */
  if (typeof document !== "undefined" && document.fonts) {
    document.fonts.load('40px "Great Vibes"').catch(() => undefined);
    document.fonts.load('italic 20px "Cormorant Garamond"').catch(() => undefined);
    document.fonts.ready.then(() => {
      textDirty = true;
    });
  }

  function rebuild(): void {
    DPR = Math.min(window.devicePixelRatio || 1, dprCap);
    W = window.innerWidth;
    H = window.innerHeight;
    M = Math.min(W, H);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    resetXform(ctx, DPR);
    q = Math.min(DPR, 2);
    field = buildField(W, H, M, q, makeRng(20210921));
    bq = layoutBouquet(W, H, M, q, makeRng(777), bq);
    amb = buildAmbient(W, H, M, q, makeRng(4242), REDUCED || IS_TOUCH);
    textDirty = true;
  }

  /* ---------- calidad adaptativa ---------- */
  let emaDt = 1 / 60;
  let adaptTimer = 0;
  let downgrades = 0;

  /* ---------- bucle ---------- */
  let raf = 0;
  let tStart = -1;
  let lastT = -1;

  function frame(ms: number): void {
    raf = requestAnimationFrame(frame);
    if (!bq || !amb) return;
    const now = ms / 1000;
    if (tStart < 0) {
      tStart = now;
      lastT = now;
    }
    if (lastT < 0) lastT = now;
    let dt = now - lastT;
    lastT = now;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    const at = now - tStart;
    if (phase === "field") {
      animT += dt;
      emaDt = emaDt * 0.92 + dt * 0.08;
      adaptTimer += dt;
      if (adaptTimer > 2.5) {
        adaptTimer = 0;
        if (emaDt > 0.033 && downgrades < 2 && DPR > 1) {
          downgrades++;
          dprCap = Math.max(1, DPR - 0.5);
          parts.setMax(120);
          rebuild();
          if (!bq || !amb) return;
        }
      }
    }

    const bloom = bloomOf(bq, animT);
    const g = ctx;
    drawBackground(g, amb, W, H, M, bloom, at);
    drawStars(g, amb, at);
    drawShoot(g, amb, W, H, dt, REDUCED);
    drawField(g, DPR, field, animT, bloom, motion);
    drawFireflies(g, amb, W, H, M, at, dt);
    drawBouquet(g, bq, animT, motion, parts, M);
    drawPollen(g, amb, W, H, at, dt);
    parts.draw(g, DPR, dt);

    if (animT >= bq.tb.textAt - 0.05) {
      if (textDirty || !textSpr) {
        textSpr = bakeText(opts.messages, W, H, M, q);
        textDirty = false;
      }
      drawText(g, textSpr, animT, at, W, H, bq.tb.textAt);
    }
  }

  /* ---------- eventos ---------- */
  let resizeTimer = 0;
  const onResize = (): void => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (window.innerWidth !== W || window.innerHeight !== H) rebuild();
    }, 120);
  };
  const onVisibility = (): void => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) {
      lastT = -1;
      raf = requestAnimationFrame(frame);
    }
  };
  let lastMove = 0;
  const onPointerDown = (e: PointerEvent): void => {
    if (phase !== "field") return;
    const ok = parts.tap(e.clientX, e.clientY, Math.max(0.6, M / 1000), REDUCED, performance.now() / 1000);
    if (ok) opts.onInteract?.();
  };
  const onPointerMove = (e: PointerEvent): void => {
    if (phase !== "field") return;
    const now = performance.now();
    if (now - lastMove < 60) return;
    lastMove = now;
    parts.trail(e.clientX, e.clientY);
  };
  const onDblClick = (): void => {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    } catch {
      /* ignorar */
    }
  };

  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("dblclick", onDblClick);

  rebuild();
  raf = requestAnimationFrame(frame);

  return {
    start() {
      if (phase === "field") return;
      phase = "field";
      animT = 0;
      if (REDUCED && bq) animT = bq.tb.textAt + 2;
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("dblclick", onDblClick);
    },
  };
}
