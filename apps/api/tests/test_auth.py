def test_signup_login_me(client, auth_headers):
    me = client.get("/api/auth/me", headers=auth_headers)
    assert me.status_code == 200
    assert me.json()["role"] == "user"  # never admin by default
    assert "-" in me.json()["id"]  # UUID, not sequential int


def test_login_wrong_password(client):
    client.post("/api/auth/signup",
                json={"email": "w@example.com", "password": "password123"})
    resp = client.post("/api/auth/login",
                       json={"email": "w@example.com", "password": "wrongpass1"})
    assert resp.status_code == 401


def test_integer_id_rejected(client, auth_headers):
    resp = client.get("/api/projects/123", headers=auth_headers)
    assert resp.status_code == 422  # UUID validation, no sequential ids


def test_user_forbidden_from_admin(client, auth_headers):
    assert client.get("/api/admin/users", headers=auth_headers).status_code == 403


def test_refresh_via_cookie_only(client):
    """7-day sessions: no body token, refresh cookie carries the rotation."""
    signup = client.post("/api/auth/signup",
                         json={"email": "cookierefresh@example.com", "password": "password123"})
    assert signup.status_code == 201
    assert "refresh_token=" in signup.headers.get("set-cookie", "")
    rotated = client.post("/api/auth/refresh", json={})
    assert rotated.status_code == 200, rotated.text
    assert rotated.json()["access_token"]
    assert "refresh_token=" in rotated.headers.get("set-cookie", "")


def test_refresh_empty_without_cookie():
    from fastapi.testclient import TestClient
    from app.main import app
    from conftest import _override
    from app.db.client import get_db

    app.dependency_overrides[get_db] = _override
    try:
        with TestClient(app) as bare:
            resp = bare.post("/api/auth/refresh", json={})
            assert resp.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_admin_tokens_per_user(client, auth_headers):
    """Stats carry a grand total plus per-account token rows."""
    from app.core.security import hash_password
    from app.repositories import user_repo
    from conftest import TestingSession

    db = TestingSession()
    admin = user_repo.create(db, email="tokadmin@example.com",
                             password_hash=hash_password("adminpass123"),
                             display_name="Tok Admin")
    user_repo.set_role(db, admin, "admin")
    login = client.post("/api/auth/login",
                        json={"email": "tokadmin@example.com", "password": "adminpass123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    gen = client.post("/api/generate", headers=auth_headers,
                      json={"title": "Token Doc", "idea": "A token-counted doc idea here",
                            "doc_type": "rdd", "depth": "brief"})
    assert gen.status_code == 200, gen.text

    stats = client.get("/api/admin/stats", headers=headers).json()
    assert stats["tokens_total"] > 0
    by_email = {row["email"]: row["tokens"] for row in stats["tokens_per_user"]}
    assert by_email.get("tokadmin@example.com", 0) >= 0
    assert sum(by_email.values()) == stats["tokens_total"]


def test_admin_can_list_users(client):
    from app.core.security import hash_password
    from app.db.client import get_db as _unused  # noqa: F401
    from app.repositories import user_repo
    from conftest import TestingSession

    db = TestingSession()
    admin = user_repo.create(db, email="admin@example.com",
                             password_hash=hash_password("adminpass123"),
                             display_name="Admin")
    user_repo.set_role(db, admin, "admin")

    login = client.post("/api/auth/login",
                        json={"email": "admin@example.com", "password": "adminpass123"})
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    users = client.get("/api/admin/users", headers=headers)
    assert users.status_code == 200
    assert users.json()["total"] >= 2
