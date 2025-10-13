from __future__ import annotations

from datetime import UTC, datetime

import pytest

from dgcommander.services.deltaglider import (
    BucketSnapshot,
    InMemoryDeltaGliderSDK,
    LogicalObject,
)


@pytest.fixture()
def sdk_with_many_objects():
    """Create SDK with 10 objects to test sorting across pagination."""
    now = datetime(2024, 1, 1, tzinfo=UTC)
    objects = {
        "test-bucket": [
            LogicalObject(
                key="data/file-01.txt",
                original_bytes=1000,
                stored_bytes=500,
                compressed=True,
                modified=datetime(2024, 1, 1, tzinfo=UTC),
                physical_key="data/file-01.txt",
            ),
            LogicalObject(
                key="data/file-02.txt",
                original_bytes=5000,
                stored_bytes=2500,
                compressed=True,
                modified=datetime(2024, 1, 5, tzinfo=UTC),
                physical_key="data/file-02.txt",
            ),
            LogicalObject(
                key="data/file-03.txt",
                original_bytes=3000,
                stored_bytes=1500,
                compressed=True,
                modified=datetime(2024, 1, 3, tzinfo=UTC),
                physical_key="data/file-03.txt",
            ),
            LogicalObject(
                key="data/file-04.txt",
                original_bytes=2000,
                stored_bytes=1000,
                compressed=True,
                modified=datetime(2024, 1, 2, tzinfo=UTC),
                physical_key="data/file-04.txt",
            ),
            LogicalObject(
                key="data/file-05.txt",
                original_bytes=4000,
                stored_bytes=2000,
                compressed=True,
                modified=datetime(2024, 1, 4, tzinfo=UTC),
                physical_key="data/file-05.txt",
            ),
        ]
    }
    stored_total = sum(obj.stored_bytes for obj in objects["test-bucket"])
    original_total = sum(obj.original_bytes for obj in objects["test-bucket"])
    savings_pct = (1.0 - (stored_total / original_total)) * 100.0
    buckets = [
        BucketSnapshot(
            name="test-bucket",
            object_count=len(objects["test-bucket"]),
            original_bytes=original_total,
            stored_bytes=stored_total,
            savings_pct=savings_pct,
            computed_at=now,
        )
    ]
    blobs = {(bucket, obj.key): b"test data" for bucket, objs in objects.items() for obj in objs}
    return InMemoryDeltaGliderSDK(buckets=buckets, objects=objects, blobs=blobs)


@pytest.fixture()
def app_with_many_objects(sdk_with_many_objects):
    from dgcommander.app import create_app
    from dgcommander.deps import DGCommanderConfig, build_services

    config = DGCommanderConfig(hmac_secret="test-secret", test_mode=True)
    services = build_services(config, sdk_with_many_objects)
    flask_app = create_app(config=config, services=services)
    flask_app.config.update(TESTING=True)
    return flask_app


@pytest.fixture()
def client_with_many_objects(app_with_many_objects):
    return app_with_many_objects.test_client()


def test_sorting_across_pagination(client_with_many_objects):
    """Test that sorting considers ALL objects in the folder, not just the current page."""
    # Get first page sorted by size ascending (limit=2 to test pagination)
    first_page = client_with_many_objects.get(
        "/api/objects/",
        query_string={
            "bucket": "test-bucket",
            "prefix": "data/",
            "limit": 2,
            "sort": "size",
            "order": "asc",
        },
    )
    assert first_page.status_code == 200
    page1 = first_page.get_json()
    assert len(page1["objects"]) == 2

    # First page should have the 2 smallest files
    assert page1["objects"][0]["key"] == "data/file-01.txt"  # 1000 bytes
    assert page1["objects"][0]["original_bytes"] == 1000
    assert page1["objects"][1]["key"] == "data/file-04.txt"  # 2000 bytes
    assert page1["objects"][1]["original_bytes"] == 2000

    # Get second page
    second_page = client_with_many_objects.get(
        "/api/objects/",
        query_string={
            "bucket": "test-bucket",
            "prefix": "data/",
            "limit": 2,
            "cursor": page1["cursor"],
            "sort": "size",
            "order": "asc",
        },
    )
    assert second_page.status_code == 200
    page2 = second_page.get_json()
    assert len(page2["objects"]) == 2

    # Second page should have the next 2 smallest files
    assert page2["objects"][0]["key"] == "data/file-03.txt"  # 3000 bytes
    assert page2["objects"][0]["original_bytes"] == 3000
    assert page2["objects"][1]["key"] == "data/file-05.txt"  # 4000 bytes
    assert page2["objects"][1]["original_bytes"] == 4000

    # Get third page
    third_page = client_with_many_objects.get(
        "/api/objects/",
        query_string={
            "bucket": "test-bucket",
            "prefix": "data/",
            "limit": 2,
            "cursor": page2["cursor"],
            "sort": "size",
            "order": "asc",
        },
    )
    assert third_page.status_code == 200
    page3 = third_page.get_json()
    assert len(page3["objects"]) == 1

    # Third page should have the largest file
    assert page3["objects"][0]["key"] == "data/file-02.txt"  # 5000 bytes
    assert page3["objects"][0]["original_bytes"] == 5000
    assert page3["cursor"] is None  # No more pages


def test_sorting_by_date_across_pagination(client_with_many_objects):
    """Test that date sorting considers ALL objects."""
    # Get first page sorted by modified date descending
    first_page = client_with_many_objects.get(
        "/api/objects/",
        query_string={
            "bucket": "test-bucket",
            "prefix": "data/",
            "limit": 2,
            "sort": "modified",
            "order": "desc",
        },
    )
    assert first_page.status_code == 200
    page1 = first_page.get_json()
    assert len(page1["objects"]) == 2

    # Should return newest files first
    assert page1["objects"][0]["key"] == "data/file-02.txt"  # 2024-01-05
    assert page1["objects"][1]["key"] == "data/file-05.txt"  # 2024-01-04

    # Get second page
    second_page = client_with_many_objects.get(
        "/api/objects/",
        query_string={
            "bucket": "test-bucket",
            "prefix": "data/",
            "limit": 2,
            "cursor": page1["cursor"],
            "sort": "modified",
            "order": "desc",
        },
    )
    assert second_page.status_code == 200
    page2 = second_page.get_json()

    # Should continue with next newest files
    assert page2["objects"][0]["key"] == "data/file-03.txt"  # 2024-01-03
    assert page2["objects"][1]["key"] == "data/file-04.txt"  # 2024-01-02


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
