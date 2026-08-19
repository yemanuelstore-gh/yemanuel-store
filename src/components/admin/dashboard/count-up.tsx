"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated number counter. Renders the final value immediately on first
 * server render (no flash of zero), then eases from 0 on mount.
 */
export function CountUp({
  value,
  format,
  duration = 800,
}: {
  value: number;
  format?: (value: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const [mounted, setMounted] = useState(false);
  const rafRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    const start = performance.now();
    rafRef.current = requestAnimationFrame(function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  if (!mounted) {
    return <>{format ? format(value) : value}</>;
  }
  return <>{format ? format(display) : Math.round(display).toLocaleString("en-GB")}</>;
}