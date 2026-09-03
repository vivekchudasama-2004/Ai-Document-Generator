/* Client-side humanized copy: network failures and fallbacks.
   Server errors already arrive humanized as { code, message } —
   this file covers everything that never reaches the server. */

export const FALLBACK_ERROR =
  "Something hiccuped on our side. Your work is safe — try again.";

export const OFFLINE_ERROR =
  "You're offline. Reconnect and try again.";

export const STREAM_ERROR =
  "The live draft dropped. Your saved sections are safe — generate again to resume.";

/** Friendly labels for known server codes (shown only if the server
 *  message is missing — server copy wins otherwise). */
const CODE_LABELS: Record<string, string> = {
  AUTH_REQUIRED: "You're signed out. Log in to continue.",
  AUTH_EXPIRED: "Your session expired. Log in again — your work is safe.",
  DOC_NOT_FOUND: "We couldn't find that document. It may have been deleted.",
  MODEL_UNAVAILABLE: "The writing service is busy. Try again shortly.",
  DB_NOT_CONFIGURED: "The service database is unreachable. Try again in a bit.",
};

export function labelForCode(code?: string): string {
  if (code && CODE_LABELS[code]) return CODE_LABELS[code];
  return FALLBACK_ERROR;
}
