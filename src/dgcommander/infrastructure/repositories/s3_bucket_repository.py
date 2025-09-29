"""S3-based implementation of BucketRepository."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from ...contracts.buckets import BucketStats
from ...domain.repositories import BucketRepository
from ...services.enhanced_deltaglider import EnhancedDeltaGliderSDK
from ...util.cache import ThreadSafeTTLCache


class S3BucketRepository(BucketRepository):
    """S3-backed bucket repository implementation."""

    def __init__(self, sdk: EnhancedDeltaGliderSDK, cache: ThreadSafeTTLCache | None = None):
        self._sdk = sdk
        self._cache = cache or ThreadSafeTTLCache(maxsize=100, ttl_seconds=60)
        self._lock = asyncio.Lock()

    async def list_buckets(self) -> list[BucketStats]:
        """List all buckets with caching."""
        cache_key = "buckets:all"

        # Check cache
        cached = self._cache.get(cache_key)
        if cached:
            return cached

        # Fetch from SDK
        snapshots = await self._run_sync(self._sdk.list_buckets)

        # Convert to contract models
        buckets = []
        for snapshot in snapshots:
            bucket = BucketStats(
                name=snapshot.name,
                object_count=snapshot.object_count,
                original_bytes=snapshot.original_bytes,
                stored_bytes=snapshot.stored_bytes,
                savings_pct=snapshot.savings_pct,
                computed_at=snapshot.computed_at,
                pending=False,
            )
            buckets.append(bucket)

        # Cache result
        self._cache.set(cache_key, buckets)

        return buckets

    async def get_bucket(self, name: str) -> BucketStats | None:
        """Get bucket by name."""
        buckets = await self.list_buckets()
        for bucket in buckets:
            if bucket.name == name:
                return bucket
        return None

    async def create_bucket(self, name: str, region: str = "us-east-1") -> BucketStats:
        """Create a new bucket."""
        # Create bucket
        await self._run_sync(self._sdk.create_bucket, name)

        # Clear cache
        self._cache.clear()

        # Return new bucket stats
        return BucketStats(
            name=name,
            object_count=0,
            original_bytes=0,
            stored_bytes=0,
            savings_pct=0.0,
            computed_at=datetime.now(UTC),
            pending=False,
        )

    async def delete_bucket(self, name: str, force: bool = False) -> bool:
        """Delete a bucket."""
        try:
            if force:
                # Delete all objects first if force is True
                listing = await self._run_sync(self._sdk.list_objects, name, "")
                for obj in listing.objects:
                    await self._run_sync(self._sdk.delete_object, name, obj.key)

            # Delete bucket
            await self._run_sync(self._sdk.delete_bucket, name)

            # Clear cache
            self._cache.clear()

            return True
        except Exception:
            return False

    async def bucket_exists(self, name: str) -> bool:
        """Check if bucket exists."""
        bucket = await self.get_bucket(name)
        return bucket is not None

    async def compute_bucket_savings(self, name: str) -> BucketStats:
        """Compute savings for a bucket."""
        # Get compression statistics
        stats = await self._run_sync(self._sdk.get_compression_statistics, name)

        # Create updated bucket stats
        bucket = BucketStats(
            name=name,
            object_count=stats["total_objects"],
            original_bytes=stats["total_original_bytes"],
            stored_bytes=stats["total_stored_bytes"],
            savings_pct=stats["overall_compression_rate"],
            computed_at=datetime.now(UTC),
            pending=False,
        )

        # Update cache
        cache_key = f"bucket:{name}:stats"
        self._cache.set(cache_key, bucket)

        # Also invalidate the main buckets list to force refresh
        self._cache.pop("buckets:all")

        return bucket

    async def _run_sync(self, func, *args, **kwargs):
        """Run synchronous SDK function in executor."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, func, *args, **kwargs)
