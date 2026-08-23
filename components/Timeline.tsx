"use client";

import { useCallback, useRef, useState } from "react";
import { TIMELINE_MIN, TIMELINE_MAX } from "@/lib/photos";

type Props = {
  from: number;
  to: number;
  count: number;
  onChange: (from: number, to: number) => void;
};

const MIN_GAP = 1;

export default function Timeline({ from, to, count, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"from" | "to" | null>(null);

  const toPercent = (year: number) =>
    ((year - TIMELINE_MIN) / (TIMELINE_MAX - TIMELINE_MIN)) * 100;

  const yearFromClientX = useCallback((clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(TIMELINE_MIN + ratio * (TIMELINE_MAX - TIMELINE_MIN));
  }, []);

  const startDrag = (handle: "from" | "to") => (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(handle);

    const move = (ev: PointerEvent) => {
      const year = yearFromClientX(ev.clientX);
      if (handle === "from") {
        onChange(Math.min(year, to - MIN_GAP), to);
      } else {
        onChange(from, Math.max(year, from + MIN_GAP));
      }
    };
    const up = () => {
      setDragging(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const handleKey = (handle: "from" | "to") => (e: React.KeyboardEvent) => {
    const delta =
      e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (!delta) return;
    e.preventDefault();
    if (handle === "from") {
      const next = Math.min(
        Math.max(TIMELINE_MIN, from + delta),
        to - MIN_GAP
      );
      onChange(next, to);
    } else {
      const next = Math.max(
        Math.min(TIMELINE_MAX, to + delta),
        from + MIN_GAP
      );
      onChange(from, next);
    }
  };

  const ticks = [TIMELINE_MIN, 1850, 1900, 1950, 2000, TIMELINE_MAX];

  return (
    <div className="timeline" role="group" aria-label="Filtro por época">
      <div className="timeline-years">
        <span className="range-label">
          {from} — {to}
        </span>
        <span className="range-count">
          {count} {count === 1 ? "fotografía" : "fotografías"}
        </span>
      </div>

      <div className="slider" ref={trackRef}>
        <div className="slider-track" />
        <div
          className="slider-fill"
          style={{
            left: `${toPercent(from)}%`,
            width: `${toPercent(to) - toPercent(from)}%`,
          }}
        />
        <div
          className={`slider-handle${dragging === "from" ? " dragging" : ""}`}
          style={{ left: `${toPercent(from)}%` }}
          onPointerDown={startDrag("from")}
          onKeyDown={handleKey("from")}
          role="slider"
          tabIndex={0}
          aria-label="Año inicial"
          aria-valuemin={TIMELINE_MIN}
          aria-valuemax={to - MIN_GAP}
          aria-valuenow={from}
        />
        <div
          className={`slider-handle${dragging === "to" ? " dragging" : ""}`}
          style={{ left: `${toPercent(to)}%` }}
          onPointerDown={startDrag("to")}
          onKeyDown={handleKey("to")}
          role="slider"
          tabIndex={0}
          aria-label="Año final"
          aria-valuemin={from + MIN_GAP}
          aria-valuemax={TIMELINE_MAX}
          aria-valuenow={to}
        />
      </div>

      <div className="slider-ticks" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
}
