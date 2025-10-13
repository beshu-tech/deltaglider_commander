"""Tests for ListObjectsCache."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from dgcommander.services.deltaglider import BucketSnapshot, InMemoryDeltaGliderSDK, LogicalObject
from dgcommander.services.list_cache import ListObjectsCache


@pytest.fixture()
def sdk_with_objects():
    """Create SDK with test objects."""
    now = datetime(2024, 1, 1, tzinfo=UTC)
    objects = {
        "test-bucket": [
            LogicalObject(
                key="data/file-01.txt",
                original_bytes=1000,
                stored_bytes=500,
                compressed=True,
                modified=now,
                physical_key="data/file-01.txt",
            ),
            LogicalObject(
                key="data/file-02.txt",
                original_bytes=2000,
                stored_bytes=1000,
                compressed=True,
                modified=now,
                physical_key="data/file-02.txt",
            ),
        ]
    }
    buckets = [
        BucketSnapshot(
            name="test-bucket",
            object_count=2,
            original_bytes=3000,
            stored_bytes=1500,
            savings_pct=50.0,
            computed_at=now,
        )
    ]
    blobs = {(bucket, obj.key): b"test data" for bucket, objs in objects.items() for obj in objs}
    return InMemoryDeltaGliderSDK(buckets=buckets, objects=objects, blobs=blobs)


@pytest.fixture()
def app_with_cache(sdk_with_objects):
    """Create app with cache enabled."""
    from dgcommander.app import create_app
    from dgcommander.deps import DGCommanderConfig, build_services

    config = DGCommanderConfig(
        hmac_secret="test-secret",
        test_mode=True,
        list_cache_ttl=30,  # Enable cache with 30s TTL
        list_cache_max_size=100,
    )
    services = build_services(config, sdk_with_objects)
    flask_app = create_app(config=config, services=services)
    flask_app.config.update(TESTING=True)
    return flask_app


@pytest.fixture()
def client_with_cache(app_with_cache):
    return app_with_cache.test_client()


def test_cache_hit_on_repeated_request(client_with_cache):
    """Test that repeated requests hit the cache."""
    # First request - cache miss
    response1 = client_with_cache.get(
        "/api/objects/",
        query_string={
            "bucket": "test-bucket",
            "prefix": "data/",
            "limit": 10,
        },
    )
    assert response1.status_code == 200
    data1 = response1.get_json()
    assert len(data1["objects"]) == 2

    # Second request with same parameters - should hit cache
    response2 = client_with_cache.get(
        "/api/objects/",
        query_string={
            "bucket": "test-bucket",
            "prefix": "data/",
            "limit": 10,
        },
    )
    assert response2.status_code == 200
    data2 = response2.get_json()
    assert data2 == data1  # Should return same data


def test_cache_different_sort_orders(client_with_cache):
    """Test that different sort orders are cached separately."""
    # Request with name sort
    response1 = client_with_cache.get(
        "/api/objects/",
        query_string={
            "bucket": "test-bucket",
            "prefix": "data/",
            "limit": 10,
            "sort": "name",
            "order": "asc",
        },
    )
    assert response1.status_code == 200
    data1 = response1.get_json()

    # Request with size sort
    response2 = client_with_cache.get(
        "/api/objects/",
        query_string={
            "bucket": "test-bucket",
            "prefix": "data/",
            "limit": 10,
            "sort": "size",
            "order": "asc",
        },
    )
    assert response2.status_code == 200
    data2 = response2.get_json()

    # Both should succeed and potentially have different order
    assert len(data1["objects"]) == 2
    assert len(data2["objects"]) == 2


def test_cache_invalidation_on_upload(sdk_with_objects):
    """Test that cache is invalidated after uploading an object."""
    import io

    from dgcommander.services.catalog import CatalogService
    from dgcommander.util.types import ObjectSortOrder

    # Create catalog with cache
    cache = ListObjectsCache(ttl_seconds=30, max_size=100)
    catalog = CatalogService(sdk=sdk_with_objects, list_cache=cache)
    credentials_key = "test-credentials-123"

    # First list - populate cache
    result1 = catalog.list_objects(
        bucket="test-bucket",
        prefix="data/",
        limit=10,
        cursor=None,
        sort_order=ObjectSortOrder.name_asc,
        compressed=None,
        search=None,
        credentials_key=credentials_key,
    )
    assert len(result1.objects) == 2
    assert cache.stats()["hits"] == 0  # First request is a miss
    assert cache.stats()["misses"] == 1

    # List again - should hit cache
    result1_cached = catalog.list_objects(
        bucket="test-bucket",
        prefix="data/",
        limit=10,
        cursor=None,
        sort_order=ObjectSortOrder.name_asc,
        compressed=None,
        search=None,
        credentials_key=credentials_key,
    )
    assert len(result1_cached.objects) == 2
    assert cache.stats()["hits"] == 1  # Second request hits cache

    # Upload a new object (this should invalidate the cache)
    file_data = io.BytesIO(b"new file content")
    catalog.upload_object("test-bucket", "data/file-03.txt", file_data)

    # List again - cache should be invalidated, should see new file
    result2 = catalog.list_objects(
        bucket="test-bucket",
        prefix="data/",
        limit=10,
        cursor=None,
        sort_order=ObjectSortOrder.name_asc,
        compressed=None,
        search=None,
        credentials_key=credentials_key,
    )
    assert len(result2.objects) == 3  # Now has 3 objects
    # This was a cache miss because cache was invalidated
    assert cache.stats()["misses"] == 2


def test_cache_invalidation_on_delete(client_with_cache):
    """Test that cache is invalidated after deleting an object."""
    # First request - populate cache
    response1 = client_with_cache.get(
        "/api/objects/",
        query_string={
            "bucket": "test-bucket",
            "prefix": "data/",
            "limit": 10,
        },
    )
    assert response1.status_code == 200
    data1 = response1.get_json()
    assert len(data1["objects"]) == 2

    # Delete one object
    response_delete = client_with_cache.delete("/api/objects/test-bucket/data/file-01.txt")
    assert response_delete.status_code == 200

    # Request again - cache should be invalidated, should see only 1 file
    response2 = client_with_cache.get(
        "/api/objects/",
        query_string={
            "bucket": "test-bucket",
            "prefix": "data/",
            "limit": 10,
        },
    )
    assert response2.status_code == 200
    data2 = response2.get_json()
    assert len(data2["objects"]) == 1  # Now has only 1 object
    assert data2["objects"][0]["key"] == "data/file-02.txt"


def test_cache_credentials_isolation():
    """Test that cache properly isolates entries by session ID (SECURITY)."""
    from dgcommander.services.deltaglider import LogicalObject

    cache = ListObjectsCache(ttl_seconds=30, max_size=100)
    creds_a = "user-a-credentials-abc"
    creds_b = "user-b-credentials-def"

    # User A stores objects
    obj_a = LogicalObject(
        key="sensitive-data.txt",
        original_bytes=100,
        stored_bytes=50,
        compressed=True,
        modified=datetime.now(UTC),
        physical_key="sensitive-data.txt",
    )
    cache.set(creds_a, "private-bucket", "data/", "name_asc", None, None, [obj_a], [])

    # User A can retrieve their own data
    result_a = cache.get(creds_a, "private-bucket", "data/", "name_asc", None, None)
    assert result_a is not None
    assert len(result_a.objects) == 1
    assert result_a.objects[0].key == "sensitive-data.txt"

    # User B tries to access same bucket with different session - should get cache miss
    result_b = cache.get(creds_b, "private-bucket", "data/", "name_asc", None, None)
    assert result_b is None  # SECURITY: Different session = cache miss

    # User B stores their own objects (different data for same bucket)
    obj_b = LogicalObject(
        key="other-file.txt",
        original_bytes=200,
        stored_bytes=100,
        compressed=True,
        modified=datetime.now(UTC),
        physical_key="other-file.txt",
    )
    cache.set(creds_b, "private-bucket", "data/", "name_asc", None, None, [obj_b], [])

    # User A still gets their own data
    result_a_again = cache.get(creds_a, "private-bucket", "data/", "name_asc", None, None)
    assert result_a_again is not None
    assert len(result_a_again.objects) == 1
    assert result_a_again.objects[0].key == "sensitive-data.txt"  # Still user A's data

    # User B gets their own data
    result_b_again = cache.get(creds_b, "private-bucket", "data/", "name_asc", None, None)
    assert result_b_again is not None
    assert len(result_b_again.objects) == 1
    assert result_b_again.objects[0].key == "other-file.txt"  # User B's data

    # Verify both sessions are isolated
    assert cache.stats()["cached_entries"] == 2  # Two separate cache entries


def test_list_cache_stats():
    """Test cache statistics tracking."""
    cache = ListObjectsCache(ttl_seconds=30, max_size=100)
    credentials_key = "test-credentials-456"

    # Initial stats
    stats = cache.stats()
    assert stats["hits"] == 0
    assert stats["misses"] == 0
    assert stats["total_requests"] == 0
    assert stats["hit_rate_percent"] == 0.0

    # Cache miss
    result = cache.get(credentials_key, "bucket", "prefix", "name_asc", None, None)
    assert result is None
    stats = cache.stats()
    assert stats["misses"] == 1

    # Store and hit
    from dgcommander.services.deltaglider import LogicalObject

    obj = LogicalObject(
        key="test.txt",
        original_bytes=100,
        stored_bytes=50,
        compressed=True,
        modified=datetime.now(UTC),
        physical_key="test.txt",
    )
    cache.set(credentials_key, "bucket", "prefix", "name_asc", None, None, [obj], [])
    result = cache.get(credentials_key, "bucket", "prefix", "name_asc", None, None)
    assert result is not None
    stats = cache.stats()
    assert stats["hits"] == 1
    assert stats["misses"] == 1
    assert stats["hit_rate_percent"] == 50.0
