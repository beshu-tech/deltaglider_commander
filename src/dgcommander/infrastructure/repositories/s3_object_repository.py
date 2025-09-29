"""S3-based implementation of ObjectRepository."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

from ...contracts.objects import ObjectItem
from ...domain.repositories import ObjectRepository
from ...services.cache_strategy import CacheLevel, IntelligentCache
from ...services.deltaglider import S3DeltaGliderSDK


class S3ObjectRepository(ObjectRepository):
    """S3-backed object repository implementation."""

    def __init__(self, sdk: S3DeltaGliderSDK):
        self._sdk = sdk
        self._cache = IntelligentCache()
        self._lock = asyncio.Lock()

    async def list_objects(
        self, bucket: str, prefix: str = "", limit: int = 100, cursor: str | None = None, compressed: bool | None = None
    ) -> tuple[list[ObjectItem], str | None]:
        """List objects with pagination and caching."""
        # Build cache key
        cache_key = f"list:{bucket}:{prefix}:{limit}:{cursor}:{compressed}"

        # Check cache
        cached = await self._cache.get(cache_key, CacheLevel.LISTING)
        if cached:
            return cached

        # Fetch from SDK
        listing = await self._run_sync(self._sdk.list_objects, bucket, prefix)

        # Filter by compression if specified
        objects = []
        for obj in listing.objects:
            if compressed is None or obj.compressed == compressed:
                item = ObjectItem(
                    key=obj.key,
                    original_bytes=obj.original_bytes,
                    stored_bytes=obj.stored_bytes,
                    compressed=obj.compressed,
                    modified=obj.modified,
                )
                objects.append(item)

                if len(objects) >= limit:
                    break

        # Generate cursor for pagination
        next_cursor = None
        if len(listing.objects) > limit:
            next_cursor = objects[-1].key if objects else None

        result = (objects[:limit], next_cursor)

        # Cache result
        await self._cache.set(cache_key, result, CacheLevel.LISTING)

        return result

    async def get_object_metadata(self, bucket: str, key: str) -> ObjectItem | None:
        """Get object metadata with caching."""
        cache_key = f"meta:{bucket}:{key}"

        # Check cache
        cached = await self._cache.get(cache_key, CacheLevel.METADATA)
        if cached:
            return cached

        try:
            # Fetch from SDK
            metadata = await self._run_sync(self._sdk.get_object_metadata, bucket, key)

            item = ObjectItem(
                key=metadata.key,
                original_bytes=metadata.original_bytes,
                stored_bytes=metadata.stored_bytes,
                compressed=metadata.compressed,
                modified=metadata.modified,
            )

            # Cache result
            await self._cache.set(cache_key, item, CacheLevel.METADATA)

            return item
        except (KeyError, FileNotFoundError):
            return None

    async def delete_object(self, bucket: str, key: str) -> bool:
        """Delete an object and invalidate cache."""
        try:
            await self._run_sync(self._sdk.delete_object, bucket, key)

            # Invalidate related cache entries
            await self._invalidate_object_cache(bucket, key)

            return True
        except (KeyError, FileNotFoundError):
            return False

    async def upload_object(self, bucket: str, key: str, data: bytes, metadata: dict) -> ObjectItem:
        """Upload an object with metadata."""
        from io import BytesIO

        # Create file-like object
        file_obj = BytesIO(data)

        # Upload with SDK
        result = await self._run_sync(self._sdk.analyze_and_upload, bucket, key, file_obj, auto_detect=True)

        # Create response item
        item = ObjectItem(
            key=key,
            original_bytes=result.original_bytes,
            stored_bytes=result.stored_bytes,
            compressed=result.compressed,
            modified=result.modified if hasattr(result, "modified") else None,
        )

        # Invalidate list cache for this bucket
        await self._invalidate_bucket_cache(bucket)

        return item

    async def download_object(self, bucket: str, key: str) -> bytes:
        """Download object data."""
        stream = await self._run_sync(self._sdk.open_object_stream, bucket, key)
        data = stream.read()
        stream.close()
        return data

    async def stream_object(self, bucket: str, key: str, chunk_size: int = 8192) -> AsyncIterator[bytes]:
        """Stream object data in chunks."""
        async for chunk in self._sdk.stream_object_async(bucket, key, chunk_size):
            yield chunk

    async def _run_sync(self, func, *args, **kwargs):
        """Run synchronous SDK function in executor."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, func, *args, **kwargs)

    async def _invalidate_object_cache(self, bucket: str, key: str):
        """Invalidate cache entries for an object."""
        # Clear metadata cache
        await self._cache.invalidate(f"meta:{bucket}:{key}")

        # Clear list caches that might contain this object
        await self._cache.invalidate_pattern(f"list:{bucket}:*")

    async def _invalidate_bucket_cache(self, bucket: str):
        """Invalidate all cache entries for a bucket."""
        await self._cache.invalidate_pattern(f"*{bucket}*")
