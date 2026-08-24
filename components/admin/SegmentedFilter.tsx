"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Option<T extends string> = {
  id: T;
  label: React.ReactNode;
};

/**
 * Mismo control que las pestañas Fotografías/Textos/…: una pastilla que
 * viaja entre opciones en vez de que cada botón cambie de color al
 * activarse. Se reutiliza aquí para los filtros de estado y de rol, que
 * antes tenían su propio estilo (colores por estado, sin animación).
 */
export default function SegmentedFilter<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (id: T) => void;
  options: Option<T>[];
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [marker, setMarker] = useState<{ left: number; width: number } | null>(
    null
  );

  useLayoutEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const measure = () => {
      const active = nav.querySelector<HTMLElement>('[data-active="true"]');
      if (active)
        setMarker({ left: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [value, options.length]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = options.findIndex((o) => o.id === value);
    const next = options[(index + step + options.length) % options.length];
    onChange(next.id);
    ref.current
      ?.querySelectorAll<HTMLElement>("[role=tab]")
      [options.indexOf(next)]?.focus();
  };

  return (
    <div
      className="filter-row"
      role="tablist"
      aria-label={ariaLabel}
      ref={ref}
      onKeyDown={onKeyDown}
    >
      {marker && (
        <span
          aria-hidden
          className="filter-row-marker"
          style={{ transform: `translateX(${marker.left}px)`, width: marker.width }}
        />
      )}
      {options.map((o) => (
        <Button
          key={o.id}
          variant="ghost"
          role="tab"
          tabIndex={value === o.id ? 0 : -1}
          aria-selected={value === o.id}
          data-active={value === o.id}
          className="filter-chip"
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
