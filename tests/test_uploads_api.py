from __future__ import annotations

import io


def _build_file(data: bytes, name: str):
    return (io.BytesIO(data), name)


def test_upload_single_file(client):
    response = client.post(
        "/api/upload/",
        data={
            "bucket": "releases",
            "prefix": "releases/uploads",
            "files": [_build_file(b"hello", "notes.txt")],
        },
        content_type="multipart/form-data",
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["bucket"] == "releases"
    assert payload["stats"]["count"] == 1
    result = payload["results"][0]
    assert result["key"] == "releases/uploads/notes.txt"
    assert result["original_bytes"] == 5
    assert result["stored_bytes"] == 5
    assert result["compressed"] is False

    listing = client.get(
        "/api/objects/",
        query_string={"bucket": "releases", "prefix": "releases/uploads"},
    )
    assert listing.status_code == 200
    listing_payload = listing.get_json()
    keys = {obj["key"] for obj in listing_payload["objects"]}
    assert "releases/uploads/notes.txt" in keys


def test_upload_multiple_files_with_subdirectories(client):
    response = client.post(
        "/api/upload/",
        data={
            "bucket": "releases",
            "files": [
                _build_file(b"root", "root.txt"),
                _build_file(b"inner", "docs/manual.md"),
            ],
        },
        content_type="multipart/form-data",
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["stats"]["count"] == 2
    keys = {item["key"] for item in payload["results"]}
    assert "root.txt" in keys
    assert "docs/manual.md" in keys


def test_upload_rejects_unknown_bucket(client):
    response = client.post(
        "/api/upload/",
        data={
            "bucket": "missing",
            "files": [_build_file(b"oops", "oops.txt")],
        },
        content_type="multipart/form-data",
    )
    assert response.status_code == 404
    payload = response.get_json()
    assert payload["error"]["code"] == "bucket_not_found"
