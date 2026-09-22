import { useEffect, useMemo, useState } from "react";
import { LETTER } from "../config";

interface Props {
  onOpen: () => void;
}

interface PetalSpec {
  left: number;
  dur: number;
  delay: number;
  scale: number;
}

export default function Letter({ onOpen }: Props) {
  const [opening, setOpening] = useState(false);

  const petals = useMemo<PetalSpec[]>(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        left: (i / 12) * 100 + Math.random() * 6,
        dur: 10 + Math.random() * 8,
        delay: Math.random() * 9,
        scale: 0.6 + Math.random() * 0.8,
      })),
    [],
  );

  const open = () => {
    if (opening) return;
    setOpening(true);
    onOpen();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opening]);

  return (
    <div
      className={`letter ${opening ? "letter--out" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) open();
      }}
    >
      {petals.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={{
            left: `${p.left}%`,
            width: `${14 * p.scale}px`,
            height: `${26 * p.scale}px`,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
          aria-hidden
        />
      ))}
      <div className="letter__flash" aria-hidden />

      <div className="card" role="dialog" aria-labelledby="card-title">
        <span className="card__corner card__corner--tl" aria-hidden />
        <span className="card__corner card__corner--tr" aria-hidden />
        <span className="card__corner card__corner--bl" aria-hidden />
        <span className="card__corner card__corner--br" aria-hidden />

        <div className="card__seal" aria-hidden>
          ♥
        </div>
        <div className="card__eyebrow">{LETTER.para}</div>
        <h1 id="card-title" className="card__title">
          {LETTER.titulo}
        </h1>
        <p className="card__text">
          {LETTER.texto} <span className="heart">♥</span>
        </p>
        <button type="button" className="card__btn" onClick={open} disabled={opening}>
          {LETTER.boton} <span aria-hidden>🌻</span>
        </button>
        <div className="card__hint">toca para abrir</div>
      </div>
    </div>
  );
}
