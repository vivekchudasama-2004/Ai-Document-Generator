"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Client-side Mermaid render (strict security), lazy by viewport.
 * Diagrams render when scrolled near — 4+ heavy SVGs no longer mount at once.
 * Falls back to code on error; renders immediately without IntersectionObserver.
 */
export default function MermaidBlock({ code }: { code: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
        const { svg } = await mermaid.render(`mmd${uid}`, code);
        if (live) setSvg(svg);
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [visible, code, uid]);

  if (failed || (visible && !svg)) {
    return (
      <pre className="bg-code mt-3 overflow-x-auto rounded-lg p-4 font-mono text-xs">{code}</pre>
    );
  }
  if (!visible) {
    return <div ref={boxRef} className="skeleton mt-3 h-44" aria-label="Loading diagram" />;
  }
  return (
    <div
      className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)] bg-surface p-4"
      role="img"
      aria-label="Architecture diagram"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
