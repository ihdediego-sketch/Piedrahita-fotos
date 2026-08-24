"use client";

import { useCallback, useState } from "react";

/**
 * La línea bajo una cabecera solo tiene sentido cuando hay contenido
 * pasando por debajo: si no se ha scrolleado nada, separa sin aportar
 * nada y afea el reposo. `onScroll` se cuelga del contenedor con overflow
 * y `scrolled` dice si esa cabecera debe pintar el borde.
 *
 * `onScroll` y `reset` están memorizados con `useCallback` a propósito:
 * si no, cambiarían de identidad en cada render y romperían cualquier
 * `useEffect` que dependa de ellos (p. ej. para resetear al cambiar de
 * pestaña), disparándose en renders que no tienen nada que ver con el scroll.
 */
export function useScrollBorder() {
  const [scrolled, setScrolled] = useState(false);

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrolled(e.currentTarget.scrollTop > 0);
  }, []);

  const reset = useCallback(() => setScrolled(false), []);

  return { scrolled, onScroll, reset };
}
