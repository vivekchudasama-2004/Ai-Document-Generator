"""Auth transport edges + DB URL helpers (100% on security module)."""


def test_cookie_auth_works(client):
    client.post("/api/auth/signup",
                json={"email": "cookie@example.com", "password": "password123"})
    me = client.get("/api/auth/me")  # cookie jar, no header
    assert me.status_code == 200


def test_wrong_kind_and_garbage_tokens_rejected(client):
    resp = client.post("/api/auth/signup",
                       json={"email": "kinds@example.com", "password": "password123"})
    refresh = resp.json()["refresh_token"]
    # refresh token presented as access token
    r1 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {refresh}"})
    assert r1.status_code == 401
    # garbage
    r2 = client.get("/api/auth/me", headers={"Authorization": "Bearer garbage.token.here"})
    assert r2.status_code == 401
    # malformed sub
    from app.core.security import create_access_token

    forged = create_access_token("not-a-uuid", "user")
    r3 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged}"})
    assert r3.status_code == 401


def test_db_url_helpers():
    from app.db.client import connect_args_for, normalize_url

    assert normalize_url("mysql://u:p@h/db").startswith("mysql+pymysql://")
    assert normalize_url("mysql+pymysql://u:p@h/db").startswith("mysql+pymysql://")
    assert "ssl" in connect_args_for("mysql+pymysql://u@x.tidbcloud.com:4000/db")
    assert connect_args_for("mysql+pymysql://u@localhost/db") == {}
