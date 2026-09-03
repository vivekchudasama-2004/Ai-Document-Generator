"use client";

/** CSS-only celebration burst (motion lives in tokens.css; silent under reduced motion). */
export default function Confetti({ pieces = 9 }: { pieces?: number }) {
  return (
    <span className="confetti" aria-hidden>
      {Array.from({ length: pieces }).map((_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}
