"""PUT /auth/me: display-name edit + password rotation."""


def test_update_display_name(client, auth_headers):
    resp = client.put("/api/auth/me", headers=auth_headers,
                      json={"display_name": "Doc Writer"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["display_name"] == "Doc Writer"

    me = client.get("/api/auth/me", headers=auth_headers).json()
    assert me["display_name"] == "Doc Writer"


def test_change_password_roundtrip(client):
    import uuid as _uuid

    email = f"pw-{_uuid.uuid4().hex[:8]}@example.com"
    signup = client.post("/api/auth/signup",
                         json={"email": email, "password": "password123"})
    assert signup.status_code == 201, signup.text
    token = signup.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    changed = client.put("/api/auth/me", headers=headers,
                         json={"current_password": "password123",
                               "new_password": "newpass456"})
    assert changed.status_code == 200, changed.text

    old_login = client.post("/api/auth/login",
                            json={"email": email, "password": "password123"})
    assert old_login.status_code == 401
    new_login = client.post("/api/auth/login",
                            json={"email": email, "password": "newpass456"})
    assert new_login.status_code == 200, new_login.text


def test_change_password_wrong_current_rejected(client, auth_headers):
    resp = client.put("/api/auth/me", headers=auth_headers,
                      json={"current_password": "nope-not-it",
                            "new_password": "newpass456"})
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "AUTH_BAD_CREDENTIALS"
