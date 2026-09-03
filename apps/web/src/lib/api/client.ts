/* Typed fetch wrapper: httpOnly cookie (credentials:include) + Bearer fallback. */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

let memToken: string | null = null;
export function setToken(t: string | null) {
  memToken = t;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (memToken) headers["Authorization"] = `Bearer ${memToken}`;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/")) {
    window.location.href = "/login";
    throw new ApiError(401, "Not authenticated");
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* keep statusText */
    }
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiStream(
  path: string,
  body: unknown,
  onEvent: (event: string, data: Record<string, unknown>) => void,
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (memToken) headers["Authorization"] = `Bearer ${memToken}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new ApiError(res.status, "Stream failed");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let event = "message";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop() ?? "";
    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) {
          try {
            onEvent(event, JSON.parse(line.slice(5).trim()));
          } catch {
            /* partial frame */
          }
          event = "message";
        }
      }
    }
  }
}
