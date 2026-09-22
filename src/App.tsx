import { useCallback, useEffect, useRef, useState } from "react";
import SunflowerCanvas from "./components/SunflowerCanvas";
import Letter from "./components/Letter";
import type { Scene } from "./engine/scene";
import { REDUCED } from "./engine/utils";
import { HINT } from "./config";

export default function App() {
  const sceneRef = useRef<Scene | null>(null);
  const [letterMounted, setLetterMounted] = useState(true);
  const [hint, setHint] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  const handleOpen = useCallback(() => {
    sceneRef.current?.start();
    timers.current.push(
      window.setTimeout(() => setLetterMounted(false), 1150),
      window.setTimeout(() => setHint(true), REDUCED ? 1500 : 8500),
      window.setTimeout(() => setHint(false), REDUCED ? 16000 : 24000),
    );
  }, []);

  const handleInteract = useCallback(() => setHint(false), []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black select-none">
      <SunflowerCanvas
        onScene={(s) => {
          sceneRef.current = s;
        }}
        onInteract={handleInteract}
      />
      {letterMounted && <Letter onOpen={handleOpen} />}
      <div className={`hint ${hint ? "hint--show" : ""}`} aria-live="polite">
        {HINT}
      </div>
    </div>
  );
}
