"""Tests for the decomposed CatalogService and its sub-services."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from dgcommander.services.catalog import (
    BucketStatsService,
    CatalogService,
    ObjectListingService,
    ObjectMutationService,
    _CatalogCacheManager,
    _clamp_savings_pct,
    _filter_and_sort,
)
from dgcommander.services.deltaglider import (
    BucketSnapshot,
    InMemoryDeltaGliderSDK,
    LogicalObject,
    StatsMode,
)
from dgcommander.services.list_cache import ListObjectsCache
from dgcommander.util.types import ObjectSortOrder


@pytest.fixture
def now():
    return datetime(2024, 6, 1, tzinfo=UTC)


@pytest.fixture
def objects(now):
    return {
        "test-bucket": [
            LogicalObject(
                key="docs/readme.txt",
                original_bytes=10_000,
                stored_bytes=10_000,
                compressed=False,
                modified=now,
                physical_key="docs/readme.txt",
            ),
            LogicalObject(
                key="data/archive.zip",
                original_bytes=200_000,
                stored_bytes=80_000,
                compressed=True,
                modified=now,
                physical_key="data/archive.zip",
            ),
            LogicalObject(
                key="data/small.csv",
                original_bytes=500,
                stored_bytes=500,
                compressed=False,
                modified=now,
                physical_key="data/small.csv",
            ),
        ]
    }


@pytest.fixture
def buckets(objects, now):
    objs = objects["test-bucket"]
    original = sum(o.original_bytes for o in objs)
    stored = sum(o.stored_bytes for o in objs)
    return [
        BucketSnapshot(
            name="test-bucket",
            object_count=len(objs),
            original_bytes=original,
            stored_bytes=stored,
            savings_pct=(1 - stored / original) * 100,
            computed_at=now,
        )
    ]


@pytest.fixture
def sdk(buckets, objects):
    blobs = {
        ("test-bucket", "docs/readme.txt"): b"readme content",
        ("test-bucket", "data/archive.zip"): b"zip bytes",
        ("test-bucket", "data/small.csv"): b"a,b\n1,2",
    }
    return InMemoryDeltaGliderSDK(buckets=buckets, objects=objects, blobs=blobs)


@pytest.fixture
def list_cache():
    return ListObjectsCache(max_size=50, ttl_seconds=30)


@pytest.fixture
def catalog(sdk, list_cache):
    return CatalogService(sdk=sdk, list_cache=list_cache)


# ── Helper function tests ──────────────────────────────────────────


class TestClampSavingsPct:
    def test_zero_original(self):
        assert _clamp_savings_pct(0, 100) == 0.0

    def test_negative_original(self):
        assert _clamp_savings_pct(-10, 5) == 0.0

    def test_50_percent_savings(self):
        assert _clamp_savings_pct(1000, 500) == pytest.approx(50.0)

    def test_no_savings(self):
        assert _clamp_savings_pct(1000, 1000) == pytest.approx(0.0)

    def test_growth_clamped_to_zero(self):
        # stored > original → negative savings → clamped to 0
        assert _clamp_savings_pct(100, 200) == 0.0

    def test_full_savings(self):
        assert _clamp_savings_pct(1000, 0) == pytest.approx(100.0)


class TestFilterAndSort:
    @pytest.fixture
    def objs(self, now):
        return [
            LogicalObject(
                key="b.txt", original_bytes=200, stored_bytes=200, compressed=False, modified=now, physical_key="b.txt"
            ),
            LogicalObject(
                key="a.txt", original_bytes=100, stored_bytes=100, compressed=True, modified=now, physical_key="a.txt"
            ),
            LogicalObject(
                key="c.txt", original_bytes=300, stored_bytes=300, compressed=False, modified=now, physical_key="c.txt"
            ),
        ]

    def test_sort_name_asc(self, objs):
        result = _filter_and_sort(objs, ObjectSortOrder.name_asc, compressed=None, search_key=None)
        assert [o.key for o in result] == ["a.txt", "b.txt", "c.txt"]

    def test_sort_name_desc(self, objs):
        result = _filter_and_sort(objs, ObjectSortOrder.name_desc, compressed=None, search_key=None)
        assert [o.key for o in result] == ["c.txt", "b.txt", "a.txt"]

    def test_sort_size_asc(self, objs):
        result = _filter_and_sort(objs, ObjectSortOrder.size_asc, compressed=None, search_key=None)
        assert [o.original_bytes for o in result] == [100, 200, 300]

    def test_sort_size_desc(self, objs):
        result = _filter_and_sort(objs, ObjectSortOrder.size_desc, compressed=None, search_key=None)
        assert [o.original_bytes for o in result] == [300, 200, 100]

    def test_filter_compressed_only(self, objs):
        result = _filter_and_sort(objs, ObjectSortOrder.name_asc, compressed=True, search_key=None)
        assert [o.key for o in result] == ["a.txt"]

    def test_filter_uncompressed_only(self, objs):
        result = _filter_and_sort(objs, ObjectSortOrder.name_asc, compressed=False, search_key=None)
        assert [o.key for o in result] == ["b.txt", "c.txt"]

    def test_filter_by_search(self, objs):
        result = _filter_and_sort(objs, ObjectSortOrder.name_asc, compressed=None, search_key="b.")
        assert [o.key for o in result] == ["b.txt"]

    def test_filter_combined(self, objs):
        result = _filter_and_sort(objs, ObjectSortOrder.name_asc, compressed=False, search_key="c.")
        assert [o.key for o in result] == ["c.txt"]

    def test_no_match(self, objs):
        result = _filter_and_sort(objs, ObjectSortOrder.name_asc, compressed=None, search_key="zzz")
        assert result == []


# ── CatalogCacheManager tests ──────────────────────────────────────


class TestCatalogCacheManager:
    def test_invalidate_listing_clears_bucket(self, sdk, list_cache):
        cache_mgr = _CatalogCacheManager(sdk=sdk, list_cache=list_cache)
        # Prime cache then invalidate
        list_cache.prime_listing("cred", "test-bucket", "", list(sdk.list_objects("test-bucket", "").objects), [])
        cache_mgr.invalidate_listing("test-bucket")
        lookup = list_cache.get_variant("cred", "test-bucket", "", "name_asc", None, None)
        assert lookup is None

    def test_invalidate_listing_no_cache(self, sdk):
        """No-op when list_cache is None."""
        cache_mgr = _CatalogCacheManager(sdk=sdk, list_cache=None)
        cache_mgr.invalidate_listing("test-bucket")  # Should not raise


# ── CatalogService facade tests ────────────────────────────────────


class TestCatalogServiceFacade:
    """Verify the facade delegates correctly to sub-services."""

    def test_list_buckets(self, catalog):
        buckets = catalog.list_buckets()
        assert len(buckets) == 1
        assert buckets[0].name == "test-bucket"

    def test_bucket_exists(self, catalog):
        assert catalog.bucket_exists("test-bucket") is True
        assert catalog.bucket_exists("nonexistent") is False

    def test_list_objects_basic(self, catalog):
        result = catalog.list_objects(
            bucket="test-bucket",
            prefix="",
            limit=50,
            cursor=None,
            sort_order=ObjectSortOrder.name_asc,
            compressed=None,
        )
        assert len(result.objects) == 3

    def test_list_objects_filtered_compressed(self, catalog):
        result = catalog.list_objects(
            bucket="test-bucket",
            prefix="",
            limit=50,
            cursor=None,
            sort_order=ObjectSortOrder.name_asc,
            compressed=True,
        )
        assert len(result.objects) == 1
        assert result.objects[0].key == "data/archive.zip"

    def test_list_objects_pagination(self, catalog):
        page1 = catalog.list_objects(
            bucket="test-bucket",
            prefix="",
            limit=2,
            cursor=None,
            sort_order=ObjectSortOrder.name_asc,
            compressed=None,
        )
        assert len(page1.objects) == 2
        assert page1.cursor is not None

        page2 = catalog.list_objects(
            bucket="test-bucket",
            prefix="",
            limit=2,
            cursor=page1.cursor,
            sort_order=ObjectSortOrder.name_asc,
            compressed=None,
        )
        assert len(page2.objects) == 1
        assert page2.cursor is None

    def test_list_objects_search(self, catalog):
        result = catalog.list_objects(
            bucket="test-bucket",
            prefix="",
            limit=50,
            cursor=None,
            sort_order=ObjectSortOrder.name_asc,
            compressed=None,
            search="archive",
        )
        assert len(result.objects) == 1
        assert "archive" in result.objects[0].key

    def test_get_bucket_stats(self, catalog):
        stats = catalog.get_bucket_stats("test-bucket", mode=StatsMode.quick)
        assert stats.name == "test-bucket"
        assert stats.object_count == 3

    def test_delete_object(self, catalog, sdk):
        catalog.delete_object("test-bucket", "docs/readme.txt")
        result = catalog.list_objects(
            bucket="test-bucket",
            prefix="",
            limit=50,
            cursor=None,
            sort_order=ObjectSortOrder.name_asc,
            compressed=None,
        )
        keys = [o.key for o in result.objects]
        assert "docs/readme.txt" not in keys

    def test_upload_object(self, catalog, sdk):
        import io

        file_obj = io.BytesIO(b"new file content")
        summary = catalog.upload_object("test-bucket", "new/file.txt", file_obj)
        assert summary is not None

    def test_create_and_delete_bucket(self, catalog, sdk):
        catalog.create_bucket("new-bucket")
        assert catalog.bucket_exists("new-bucket") is True

        catalog.delete_bucket("new-bucket")
        assert catalog.bucket_exists("new-bucket") is False


# ── Sub-service direct tests ───────────────────────────────────────


class TestBucketStatsService:
    def test_list_buckets_returns_stats(self, sdk):
        cache_mgr = _CatalogCacheManager(sdk=sdk)
        svc = BucketStatsService(sdk=sdk, cache_manager=cache_mgr)
        stats = svc.list_buckets()
        assert len(stats) == 1
        assert stats[0].savings_pct > 0

    def test_bucket_not_found(self, sdk):
        cache_mgr = _CatalogCacheManager(sdk=sdk)
        svc = BucketStatsService(sdk=sdk, cache_manager=cache_mgr)
        assert svc.bucket_exists("nonexistent") is False


class TestObjectListingService:
    def test_list_with_sort(self, sdk, list_cache):
        cache_mgr = _CatalogCacheManager(sdk=sdk, list_cache=list_cache)
        svc = ObjectListingService(sdk=sdk, list_cache=list_cache, cache_manager=cache_mgr)

        result = svc.list_objects(
            bucket="test-bucket",
            prefix="",
            limit=50,
            cursor=None,
            sort_order=ObjectSortOrder.size_desc,
            compressed=None,
        )
        sizes = [o.original_bytes for o in result.objects]
        assert sizes == sorted(sizes, reverse=True)

    def test_bypass_cache_invalidates(self, sdk, list_cache):
        cache_mgr = _CatalogCacheManager(sdk=sdk, list_cache=list_cache)
        svc = ObjectListingService(sdk=sdk, list_cache=list_cache, cache_manager=cache_mgr)

        # First call primes cache
        svc.list_objects(
            bucket="test-bucket",
            prefix="",
            limit=50,
            cursor=None,
            sort_order=ObjectSortOrder.name_asc,
            compressed=None,
            credentials_key="cred1",
        )
        # bypass_cache should still work
        result = svc.list_objects(
            bucket="test-bucket",
            prefix="",
            limit=50,
            cursor=None,
            sort_order=ObjectSortOrder.name_asc,
            compressed=None,
            bypass_cache=True,
        )
        assert len(result.objects) == 3


class TestObjectMutationService:
    def test_delete_invalidates_cache(self, sdk, list_cache):
        cache_mgr = _CatalogCacheManager(sdk=sdk, list_cache=list_cache)
        listing_svc = ObjectListingService(sdk=sdk, list_cache=list_cache, cache_manager=cache_mgr)
        mutation_svc = ObjectMutationService(sdk=sdk, cache_manager=cache_mgr)

        # Prime listing cache
        listing_svc.list_objects(
            bucket="test-bucket",
            prefix="",
            limit=50,
            cursor=None,
            sort_order=ObjectSortOrder.name_asc,
            compressed=None,
            credentials_key="cred1",
        )

        # Delete should invalidate cache
        mutation_svc.delete_object("test-bucket", "docs/readme.txt")

        # Re-listing should not include deleted object
        result = listing_svc.list_objects(
            bucket="test-bucket",
            prefix="",
            limit=50,
            cursor=None,
            sort_order=ObjectSortOrder.name_asc,
            compressed=None,
        )
        keys = [o.key for o in result.objects]
        assert "docs/readme.txt" not in keys
