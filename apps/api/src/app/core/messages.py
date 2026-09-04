"""Humanized error copy — plain, warm, actionable. Never blame the user,
always say what to do next. `{slot}` values are filled by callers."""
from app.core import error_codes as CODE

MESSAGES: dict[str, str] = {
    # --- auth ---
    CODE.AUTH_REQUIRED: "You're signed out. Log in to continue.",
    CODE.AUTH_EXPIRED: "Your session expired. Log in again — your work is safe.",
    CODE.AUTH_BAD_CREDENTIALS: "That email and password don't match. Double-check and try again.",
    CODE.AUTH_FORBIDDEN_ADMIN: "Admins only — this area needs an admin account.",
    CODE.AUTH_EMAIL_TAKEN: "This email already has an account. Try logging in instead.",
    CODE.AUTH_BAD_REFRESH: "Your session expired. Log in again — your work is safe.",
    CODE.AUTH_BAD_RESET: "That reset link is invalid or expired. Request a fresh one.",
    CODE.AUTH_NO_ACCOUNT: "We couldn't find that account.",
    # --- resources ---
    CODE.PROJECT_NOT_FOUND: "We couldn't find that project. It may have been deleted.",
    CODE.PROJECT_TITLE_REQUIRED: "Give the project a title first.",
    CODE.DOC_NOT_FOUND: "We couldn't find that document. It may have been deleted.",
    CODE.SECTION_NOT_FOUND: "We couldn't find that section. Reload the document and try again.",
    CODE.VERSION_NOT_FOUND: "We couldn't find that version. It may have been removed.",
    CODE.EXPORT_NOT_FOUND: "We couldn't find that export. Generate it again from the studio.",
    CODE.EXPORT_FILE_GONE: "The export file is missing. Export again from the studio.",
    CODE.TEMPLATE_UNKNOWN: "We don't have that template yet.",
    CODE.ROLE_INVALID: "Role must be user or admin.",
    CODE.SECTION_BAD_MOVE: "Sections move up or down, one step at a time.",
    # --- models / AI ---
    CODE.MODEL_NOT_ALLOWED: "That model isn't available right now ({model}). Pick another from the list.",
    CODE.MODEL_EMPTY_RESPONSE: "The model returned nothing. Try again in a moment.",
    CODE.MODEL_TOO_LONG: "That request is too long for {model}. Shorten the idea and retry.",
    CODE.MODEL_UNAVAILABLE: "The writing service is busy. Your draft is safe — try again shortly.",
    CODE.BYOK_INVALID: "That provider key can't be saved — check the provider, key, and URL, then try again.",
    CODE.BYOK_NOT_FOUND: "We couldn't find that saved key. It may have been deleted.",
    # --- platform ---
    CODE.DB_NOT_CONFIGURED: "The database isn't connected. Set TIDB_URL and restart the API.",
    CODE.RAG_NOT_CONFIGURED: "Similar-search is off. Set EMBEDDING_API_URL, EMBEDDING_API_KEY and EMBEDDING_MODEL first.",
    CODE.RAG_EMPTY_QUERY: "Type something to search for first.",
    CODE.RAG_BAD_TOP_K: "top_k must be a number between 1 and 20.",
    CODE.RAG_EMBED_FAILED: "The embeddings service didn't answer. Try again in a moment.",
}


def message_for(code: str, **slots) -> str:
    """Render a catalog message; unknown codes fall back to a safe default."""
    template = MESSAGES.get(code, "Something hiccuped on our side. Try again in a moment.")
    try:
        return template.format(**slots)
    except KeyError:
        return template
