from __future__ import annotations

from typing import Any


def _create_bucket(client, name: str) -> None:
    response = client.post("/api/buckets/", json={"name": name})
    assert response.status_code == 201


def _delete_bucket(client, name: str) -> None:
    client.delete(f"/api/buckets/{name}")


def _get_buckets(client) -> list[dict[str, Any]]:
    response = client.get("/api/buckets/")
    assert response.status_code == 200
    payload = response.get_json()
    assert "buckets" in payload
    return payload["buckets"]


def test_list_buckets_returns_expected_payload(client):
    buckets = _get_buckets(client)
    assert buckets[0]["name"] == "releases"
    assert buckets[0]["object_count"] == 3
    assert buckets[0]["original_bytes"] > buckets[0]["stored_bytes"]
    assert buckets[0]["savings_pct"] > 0


def test_compute_savings_triggers_job(app, client):
    container = app.extensions["dgcommander"]
    response = client.post("/api/buckets/releases/compute-savings")
    assert response.status_code == 202
    future = container.jobs._jobs.get("releases")  # type: ignore[attr-defined]
    if future is not None:
        future.result(timeout=2)
    updated = _get_buckets(client)[0]
    assert updated["stored_bytes"] > 0
    assert "pending" not in updated


def test_list_buckets_handles_sdk_errors(app, client, monkeypatch):
    container = app.extensions["dgcommander"]

    def broken_list_buckets(compute_stats=False):
        raise RuntimeError("boom")

    monkeypatch.setattr(container.catalog.sdk, "list_buckets", broken_list_buckets)

    response = client.get("/api/buckets/")
    assert response.status_code == 503  # Service Unavailable (S3/storage backend failure)
    payload = response.get_json()
    assert payload == {
        "error": {
            "code": "sdk_error",
            "message": "Unable to list DeltaGlider buckets",
            "details": {"reason": "boom"},
        }
    }


def test_create_bucket_adds_bucket(client):
    bucket_name = "temp-bucket"
    try:
        _create_bucket(client, bucket_name)
        buckets = _get_buckets(client)
        assert any(bucket["name"] == bucket_name for bucket in buckets)
    finally:
        _delete_bucket(client, bucket_name)


def test_create_bucket_conflict_returns_409(client):
    bucket_name = "conflict-bucket"
    try:
        _create_bucket(client, bucket_name)
        response = client.post("/api/buckets/", json={"name": bucket_name})
        assert response.status_code == 409
        payload = response.get_json()
        assert payload == {
            "error": {
                "code": "bucket_exists",
                "message": "Bucket already exists",
            }
        }
    finally:
        _delete_bucket(client, bucket_name)


def test_create_bucket_requires_name(client):
    response = client.post("/api/buckets/", json={"name": ""})
    assert response.status_code == 400
    payload = response.get_json()
    assert payload == {
        "error": {
            "code": "invalid_bucket_name",
            "message": "Bucket name is required",
        }
    }


def test_delete_bucket_removes_bucket(client):
    bucket_name = "delete-me"
    _create_bucket(client, bucket_name)
    response = client.delete(f"/api/buckets/{bucket_name}")
    assert response.status_code == 200
    buckets = _get_buckets(client)
    assert all(bucket["name"] != bucket_name for bucket in buckets)


def test_delete_missing_bucket_returns_404(client):
    response = client.delete("/api/buckets/does-not-exist")
    assert response.status_code == 404
    payload = response.get_json()
    assert payload == {
        "error": {
            "code": "bucket_not_found",
            "message": "bucket not found",
        }
    }


def test_bucket_stats_endpoint_returns_sampled_stats(client):
    response = client.get("/api/buckets/releases/stats?mode=sampled")
    assert response.status_code == 200
    payload = response.get_json()
    assert "bucket" in payload
    stats = payload["bucket"]
    assert stats["name"] == "releases"
    assert stats["object_count"] == 3
    assert stats["stored_bytes"] > 0


def test_bucket_stats_endpoint_rejects_invalid_mode(client):
    response = client.get("/api/buckets/releases/stats?mode=unknown")
    assert response.status_code == 400
    payload = response.get_json()
    assert payload == {
        "error": {
            "code": "invalid_stats_mode",
            "message": "Unsupported stats mode",
        }
    }
