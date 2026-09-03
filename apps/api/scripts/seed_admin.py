"""One-off admin seed: creates/promotes the owner account in TiDB `docuforge`.
Usage: ADMIN_PW='<password>' python scripts/seed_admin.py <email>
Reads TIDB_URL from repo-root .env (swaps /sys -> /docuforge at runtime)."""
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

import pymysql

ROOT = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(ROOT / "apps" / "api" / "src"))

from app.core.security import hash_password, verify_password  # noqa: E402


def tidb_url() -> str:
    env_file = ROOT / ".env"
    for line in env_file.read_text().splitlines():
        if line.startswith("TIDB_URL="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("TIDB_URL missing from .env")


def main() -> None:
    email = sys.argv[1].strip().lower()
    password = os.environ.get("ADMIN_PW", "")
    if len(password) < 8:
        raise RuntimeError("ADMIN_PW must be 8+ chars")
    url = tidb_url().replace("/sys", "/docuforge")
    if "+pymysql" in url:
        url = url.replace("+pymysql", "")
    parts = urlparse(url)
    db_name = (parts.path or "/docuforge").lstrip("/") or "docuforge"
    conn = pymysql.connect(
        host=parts.hostname, port=parts.port or 4000,
        user=parts.username, password=parts.password,
        database=db_name, ssl={"ssl": {}},
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO users (id, email, password_hash, display_name, role, is_active, created_at, updated_at)
                   VALUES (UUID(), %s, %s, 'Vivek', 'admin', TRUE, NOW(), NOW())
                   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash),
                   role = 'admin', display_name = 'Vivek', is_active = TRUE, updated_at = NOW()""",
                (email, hash_password(password)),
            )
            conn.commit()
            cur.execute("SELECT id, email, display_name, role FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
            cur.execute("SELECT password_hash FROM users WHERE email = %s", (email,))
            ok = verify_password(password, cur.fetchone()[0])
    finally:
        conn.close()
    print(f"email={row[1]} name={row[2]} role={row[3]} password_ok={ok}")


if __name__ == "__main__":
    main()
