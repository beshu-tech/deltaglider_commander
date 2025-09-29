from __future__ import annotations


def test_list_objects_pagination(client):
    first_page = client.get(
        "/api/objects/",
        query_string={"bucket": "releases", "prefix": "releases/", "limit": 1},
    )
    assert first_page.status_code == 200
    payload = first_page.get_json()
    assert len(payload["objects"]) == 1
    assert payload["cursor"]

    second_page = client.get(
        "/api/objects/",
        query_string={
            "bucket": "releases",
            "prefix": "releases/",
            "limit": 1,
            "cursor": payload["cursor"],
        },
    )
    assert second_page.status_code == 200
    payload_2 = second_page.get_json()
    assert len(payload_2["objects"]) == 1
    assert payload_2["objects"][0]["key"].endswith("notes.txt")


def test_object_metadata(client):
    response = client.get("/api/objects/releases/releases/v1.0.0/app.zip/metadata")
    assert response.status_code == 200
    metadata = response.get_json()
    assert metadata["key"].endswith("app.zip")
    assert metadata["accept_ranges"] is False


def test_list_objects_unknown_bucket(client):
    response = client.get(
        "/api/objects/",
        query_string={"bucket": "missing"},
    )
    assert response.status_code == 404
    payload = response.get_json()
    assert payload["error"]["code"] == "bucket_not_found"
