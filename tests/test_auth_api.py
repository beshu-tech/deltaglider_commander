from __future__ import annotations

import pytest

import dgcommander.api.auth as auth_module


@pytest.fixture(autouse=True)
def stub_auth_dependencies(monkeypatch):
    """Avoid external SDK calls when exercising auth endpoints."""

    monkeypatch.setattr(auth_module, "validate_credentials", lambda credentials: None)

    class DummySDK:
        def __init__(self, *args, **kwargs):
            self.settings = args[0] if args else None

        def list_buckets(self):  # pragma: no cover - unused but mirrors interface
            return []

    monkeypatch.setattr(auth_module, "S3DeltaGliderSDK", DummySDK)


def test_session_cookie_not_secure_over_http(client):
    payload = {"credentials": {"access_key_id": "foo", "secret_access_key": "bar"}}

    response = client.post("/api/auth/session", json=payload)

    assert response.status_code == 200
    header = response.headers.get("Set-Cookie", "")
    assert "Secure" not in header, "Secure flag should be absent on plain HTTP"


def test_session_cookie_secure_when_forwarded_proto_https(client):
    payload = {"credentials": {"access_key_id": "foo", "secret_access_key": "bar"}}

    response = client.post(
        "/api/auth/session",
        json=payload,
        headers={"X-Forwarded-Proto": "https"},
    )

    assert response.status_code == 200
    header = response.headers.get("Set-Cookie", "")
    assert "Secure" in header, "Secure flag should be set when request is HTTPS"
