/* Typed fetch wrapper: httpOnly cookie (credentials:include) + Bearer fallback.
   Understands the API envelope { detail: { code, message } } and surfaces
   humanized copy; offline and stream failures get client-side messages. */
import { FALLBACK_ERROR, OFFLINE_ERROR, STREAM_ERROR, labelForCode } from "@/lib/messages";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

let memToken: string | null = null;
export function setToken(t: string | null) {
  memToken = t;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Envelope = { detail?: { code?: string; message?: string } | string | unknown[] };

async function parseError(res: Response): Promise<ApiError> {
  let code: string | undefined;
  let message: string | undefined;
  try {
    const body = (await res.json()) as Envelope;
    const detail = body?.detail;
    if (detail && typeof detail === "object" && !Array.isArray(detail)) {
      code = detail.code;
      message = detail.message;
    } else if (Array.isArray(detail) && detail.length) {
      // Pydantic validation shape: surface the first problem plainly.
      const first = detail[0] as { loc?: (string | number)[]; msg?: string };
      const field = first.loc?.slice(-1)[0];
      message = field ? `${field}: ${first.msg ?? "invalid value"}` : (first.msg ?? FALLBACK_ERROR);
    } else if (typeof detail === "string") {
      message = detail;
    }
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(res.status, message ?? labelForCode(code), code);
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extra ?? {}),
  };
  if (memToken) headers["Authorization"] = `Bearer ${memToken}`;
  return headers;
}

const PUBLIC_PAGES = ["/", "/login", "/signup", "/forgot-password", "/reset-password"];

function redirectToLogin(apiPath: string) {
  // Auth API calls (login/signup themselves) must never trigger this.
  if (typeof window === "undefined" || apiPath.startsWith("/api/auth/")) return;
  // Public pages stay put: redirecting to /login from /login is an infinite loop.
  const page = window.location.pathname;
  if (PUBLIC_PAGES.some((publicPage) => page === publicPage || page.startsWith(`${publicPage}/`))) return;
  window.location.href = "/login";
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: authHeaders(init.headers as Record<string, string> | undefined),
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, OFFLINE_ERROR, "OFFLINE");
  }
  if (res.status === 401) {
    redirectToLogin(path);
    throw await parseError(res);
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiStream(
  path: string,
  body: unknown,
  onEvent: (event: string, data: Record<string, unknown>) => void,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, OFFLINE_ERROR, "OFFLINE");
  }
  if (res.status === 401) {
    redirectToLogin(path);
    throw await parseError(res);
  }
  if (!res.ok || !res.body) {
    if (!res.body && res.ok) throw new ApiError(res.status, STREAM_ERROR, "STREAM_EMPTY");
    throw await parseError(res);
  }
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
