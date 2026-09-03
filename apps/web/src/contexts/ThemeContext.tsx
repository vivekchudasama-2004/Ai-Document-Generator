"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { flushSync } from "react-dom";

export type Theme = "light" | "dark";
export type ThemePointer = { clientX: number; clientY: number };

type ThemeCtx = { theme: Theme; toggle: (pointer?: ThemePointer) => void };

const Ctx = createContext<ThemeCtx>({ theme: "light", toggle: () => undefined });

type TransitionalDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

function initial(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("df-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(initial());
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("df-theme", theme);
  }, [theme]);

  const toggle = useCallback(
    (pointer?: ThemePointer) => {
      const next: Theme = theme === "dark" ? "light" : "dark";
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const transitional = document as unknown as TransitionalDocument;
      // Circle-wipe from the click point (production touch). Falls back to
      // an instant swap without pointer input, reduced motion, or old browsers.
      if (!transitional.startViewTransition || reduced || !pointer) {
        setTheme(next);
        return;
      }
      const transition = transitional.startViewTransition(() => {
        flushSync(() => setTheme(next));
      });
      // Park GPU-heavy loops for the wipe so it stays smooth on low-end GPUs.
      document.documentElement.classList.add("theming");
      const done = () => document.documentElement.classList.remove("theming");
      transition.ready
        .then(() => {
          const { clientX: x, clientY: y } = pointer;
          const radius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y),
          );
          const wipe = document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${radius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 260,
              easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
              pseudoElement: "::view-transition-new(root)",
            },
          );
          wipe.finished.then(done).catch(done);
        })
        .catch(done);
    },
    [theme],
  );

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
