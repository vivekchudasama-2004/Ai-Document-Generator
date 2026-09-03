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
