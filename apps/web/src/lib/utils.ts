/** Shared client utilities: classnames + word counting. */

/** Join truthy class fragments (tiny `cn` — no dependency). */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Client-side word count (mirrors the API's 150wpp counting). */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Shorten long ids/labels for narrow screens. */
export function truncateMiddle(text: string, max = 28): string {
  if (text.length <= max) return text;
  const keep = Math.floor((max - 1) / 2);
  return `${text.slice(0, keep)}…${text.slice(-keep)}`;
}
