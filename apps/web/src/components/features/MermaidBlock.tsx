"use client";

import { useEffect, useId, useState } from "react";

/** Client-side Mermaid render (strict security). Falls back to code on error. */
export default function MermaidBlock({ code }: { code: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
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
  }, [code, uid]);

  if (failed || !svg) {
    return (
      <pre className="bg-code mt-3 overflow-x-auto rounded-lg p-4 font-mono text-xs">{code}</pre>
    );
  }
  return (
    <div
      className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)] bg-white p-4"
      role="img"
      aria-label="Architecture diagram"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
