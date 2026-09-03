/** Server-side API helper (RSC / BFF routes): same contract as the client. */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function apiGet<T>(path: string, token: string): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  if (!resp.ok) {
    throw new Error(`API ${resp.status} on ${path}`);
  }
  return (await resp.json()) as T;
}

export function apiBase(): string {
  return API_BASE;
}
