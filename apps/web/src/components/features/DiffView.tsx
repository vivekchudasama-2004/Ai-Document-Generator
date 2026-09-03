"use client";

/** Before/after unified diff viewer for a humanized section. */
export default function DiffView({ unifiedDiff }: { unifiedDiff: string }) {
  return (
    <pre
      className="bg-code mt-3 overflow-x-auto rounded-lg p-4 font-mono text-xs"
      aria-label="Changes between original and humanized text"
    >
      {unifiedDiff}
    </pre>
  );
}
