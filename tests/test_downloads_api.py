from __future__ import annotations

from itsdangerous import URLSafeTimedSerializer


def test_prepare_and_download_round_trip(app, client):
    response = client.post(
        "/api/download/prepare",
        json={"bucket": "releases", "key": "releases/v1.0.0/app.zip"},
    )
    assert response.status_code == 200
    payload = response.get_json()
    token = payload["download_token"]
    estimated = payload["estimated_bytes"]

    download = client.get(f"/api/download/{token}")
    assert download.status_code == 200
    body = download.data
    assert len(body) == estimated
    assert download.headers["Content-Disposition"].endswith("app.zip\"")
    assert download.headers["Accept-Ranges"] == "none"


def test_prepare_unknown_object_returns_404(client):
    response = client.post(
        "/api/download/prepare",
        json={"bucket": "releases", "key": "missing.zip"},
    )
    assert response.status_code == 404
    payload = response.get_json()
    assert payload["error"]["code"] == "key_not_found"


def test_download_with_invalid_token(app, client):
    serializer = URLSafeTimedSerializer("wrong", salt="dg-download")
    fake_token = serializer.dumps({"bucket": "releases", "key": "releases/v1.0.0/app.zip"})
    response = client.get(f"/api/download/{fake_token}")
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "invalid_token"

