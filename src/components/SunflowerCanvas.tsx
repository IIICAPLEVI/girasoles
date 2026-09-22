import { useEffect, useRef } from "react";
import { createScene } from "../engine/scene";
import type { Scene } from "../engine/scene";
import { MESSAGES } from "../config";

interface Props {
  onScene: (scene: Scene | null) => void;
  onInteract: () => void;
}

export default function SunflowerCanvas({ onScene, onInteract }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const interactRef = useRef(onInteract);
  const sceneCb = useRef(onScene);
  interactRef.current = onInteract;
  sceneCb.current = onScene;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const scene = createScene(cv, {
      messages: MESSAGES,
      onInteract: () => interactRef.current(),
    });
    sceneCb.current(scene);
    return () => {
      scene.destroy();
      sceneCb.current(null);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="block touch-none select-none"
      style={{ width: "100vw", height: "100vh" }}
      aria-label="Campo de girasoles animado"
    />
  );
}
