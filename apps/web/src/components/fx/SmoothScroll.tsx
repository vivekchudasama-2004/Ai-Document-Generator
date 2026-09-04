"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Lenis smooth scroll — the only motion on scroll.
 * - Dynamically imported (keeps first-load JS small; SSR-safe).
 * - Skipped entirely under prefers-reduced-motion.
 * - Paused during the theme-wipe transition (html.theming).
 * - Route changes reset scroll to top instantly (no animated travel).
 */
export default function SmoothScroll() {
  const path = usePathname();
  const lenisRef = useRef<{ destroy: () => void; stop: () => void; start: () => void; scrollTo: (t: number, o?: object) => void } | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;

    (async () => {
      const { default: Lenis } = await import("lenis");
      if (cancelled) return;
      const lenis = new Lenis({
        duration: 1.1,
        anchors: true,
        // Quiet wheel: no exaggerated smoothing on trackpads.
        smoothWheel: true,
      });
      lenisRef.current = lenis;

      let raf = 0;
      const loop = (time: number) => {
        lenis.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);

      const observer = new MutationObserver(() => {
        if (document.documentElement.classList.contains("theming")) lenis.stop();
        else lenis.start();
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

      // Store cleanup on the instance for the effect teardown below.
      lenisRef.current = Object.assign(lenis, {
        destroy: () => {
          cancelAnimationFrame(raf);
          observer.disconnect();
          lenis.destroy();
        },
      });
    })();

    return () => {
      cancelled = true;
      lenisRef.current?.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Fresh route = top of page, no animated travel.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    lenisRef.current?.scrollTo(0, { immediate: true });
  }, [path]);

  return null;
}
