"""Cache for object listing results to improve performance."""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass, field
from threading import RLock
from typing import TYPE_CHECKING

from cachetools import TTLCache

if TYPE_CHECKING:
    from ..services.deltaglider import LogicalObject

logger = logging.getLogger(__name__)


def make_credentials_cache_key(credentials: dict | None) -> str:
    """Generate stable cache key from S3 credentials.

    Uses endpoint_url and access_key_id to identify unique credential sets.
    This allows cache sharing across sessions/browsers with same credentials.

    Args:
        credentials: Dict with 'endpoint', 'access_key_id', 'region' keys

    Returns:
        Short hash string (16 chars) for use in cache keys
    """
    if not credentials:
        return "no-credentials"

    # Use endpoint and access_key_id to uniquely identify credential set
    # Don't include secret_access_key (for logging safety)
    cred_parts = [
        credentials.get("endpoint", ""),
        credentials.get("access_key_id", ""),
        credentials.get("region", ""),
    ]
    cred_str = "|".join(cred_parts)
    return hashlib.sha256(cred_str.encode()).hexdigest()[:16]


@dataclass(slots=True)
class CachedListing:
    """Cached listing with lazily-computed variants."""

    objects: tuple[LogicalObject, ...]
    common_prefixes: tuple[str, ...]
    _variants: dict[str, tuple[LogicalObject, ...]] = field(default_factory=dict, repr=False)

    @classmethod
    def from_lists(cls, objects: list[LogicalObject], common_prefixes: list[str]) -> CachedListing:
        """Create from mutable lists."""

        return cls(objects=tuple(objects), common_prefixes=tuple(common_prefixes))

    def get_variant(self, sort_order: str, compressed: bool | None, search: str | None) -> list[LogicalObject] | None:
        key = self._variant_key(sort_order, compressed, search)
        variant = self._variants.get(key)
        if variant is None:
            return None
        return list(variant)

    def store_variant(
        self, sort_order: str, compressed: bool | None, search: str | None, objects: list[LogicalObject]
    ) -> None:
        key = self._variant_key(sort_order, compressed, search)
        self._variants[key] = tuple(objects)

    @staticmethod
    def _variant_key(sort_order: str, compressed: bool | None, search: str | None) -> str:
        search_key = (search or "").lower()
        compression_key = "all" if compressed is None else str(compressed)
        return f"{sort_order}|{compression_key}|{search_key}"


@dataclass(slots=True)
class VariantLookup:
    """Result from cache lookup for an object listing variant."""

    variant: list[LogicalObject] | None
    base_objects: list[LogicalObject] | None
    common_prefixes: list[str] | None


class ListObjectsCache:
    """Thread-safe TTL cache for object listing results.

    Caches the full sorted list of objects per (credentials_key, bucket, prefix, sort_order, compressed, search) key.
    This dramatically improves performance for repeated requests (pagination, sorting changes).

    SECURITY: credentials_key is included in the cache key to isolate entries per credential set.
    This prevents data leakage between users with different S3 credentials, while allowing
    cache sharing across sessions/browsers with the same credentials (efficient!).
    """

    def __init__(self, ttl_seconds: int = 30, max_size: int = 100):
        """Initialize cache with TTL and maximum size.

        Args:
            ttl_seconds: Time-to-live for cached entries in seconds (default: 30)
            max_size: Maximum number of cached entries (LRU eviction, default: 100)
        """
        self._cache: TTLCache = TTLCache(maxsize=max_size, ttl=ttl_seconds)
        self._lock = RLock()
        self._hits = 0
        self._misses = 0
        self._bucket_index: dict[str, set[str]] = {}
        self._prefix_index: dict[tuple[str, str], set[str]] = {}
        self._key_index: dict[str, tuple[str, str]] = {}
        logger.info(f"Initialized ListObjectsCache with ttl={ttl_seconds}s, max_size={max_size}")

    def _make_key(self, credentials_key: str, bucket: str, prefix: str) -> str:
        """Generate cache key based on credentials and location."""

        key_parts = [credentials_key, bucket, prefix]
        key_str = "|".join(key_parts)
        # Use hash for shorter keys
        return hashlib.sha256(key_str.encode()).hexdigest()[:16]

    def get_listing(self, credentials_key: str, bucket: str, prefix: str) -> CachedListing | None:
        """Retrieve cached base listing if available."""

        key = self._make_key(credentials_key, bucket, prefix)
        with self._lock:
            cached = self._cache.get(key)
            if cached is not None:
                self._hits += 1
                logger.debug(
                    f"Cache HIT for creds={credentials_key[:8]}... {bucket}/{prefix} "
                    f"(hits={self._hits}, misses={self._misses})"
                )
                return cached
            self._misses += 1
            logger.debug(
                f"Cache MISS for creds={credentials_key[:8]}... {bucket}/{prefix} "
                    f"(hits={self._hits}, misses={self._misses})"
            )
            return None

    def prime_listing(
        self,
        credentials_key: str,
        bucket: str,
        prefix: str,
        objects: list[LogicalObject],
        common_prefixes: list[str],
    ) -> None:
        """Store base listing data in cache."""

        key = self._make_key(credentials_key, bucket, prefix)
        cached = CachedListing.from_lists(objects, common_prefixes)
        with self._lock:
            self._cache[key] = cached
            self._register_key(key, bucket, prefix)
            logger.debug(f"Cached base listing ({len(objects)} objects) for creds={credentials_key[:8]}... {bucket}/{prefix}")

    def get_variant(
        self,
        credentials_key: str,
        bucket: str,
        prefix: str,
        sort_order: str,
        compressed: bool | None,
        search: str | None,
    ) -> VariantLookup | None:
        """Retrieve cached variant or provide base data for recomputation."""

        key = self._make_key(credentials_key, bucket, prefix)
        with self._lock:
            cached = self._cache.get(key)
            if cached is None:
                self._misses += 1
                self._remove_key(key)
                logger.debug(
                    f"Cache MISS for creds={credentials_key[:8]}... {bucket}/{prefix} (no base listing)"
                )
                return None

            variant = cached.get_variant(sort_order, compressed, search)
            common_prefixes = list(cached.common_prefixes)
            if variant is not None:
                self._hits += 1
                logger.debug(
                    f"Variant HIT for creds={credentials_key[:8]}... {bucket}/{prefix} ({sort_order})"
                )
                return VariantLookup(variant=variant, base_objects=None, common_prefixes=common_prefixes)

            self._misses += 1
            logger.debug(
                f"Variant MISS for creds={credentials_key[:8]}... {bucket}/{prefix} ({sort_order})"
            )
            return VariantLookup(
                variant=None,
                base_objects=list(cached.objects),
                common_prefixes=common_prefixes,
            )

    def store_variant(
        self,
        credentials_key: str,
        bucket: str,
        prefix: str,
        sort_order: str,
        compressed: bool | None,
        search: str | None,
        objects: list[LogicalObject],
    ) -> None:
        """Persist a computed variant for later reuse."""

        key = self._make_key(credentials_key, bucket, prefix)
        with self._lock:
            cached = self._cache.get(key)
            if cached is None:
                return
            cached.store_variant(sort_order, compressed, search, objects)
            logger.debug(
                f"Cached variant ({sort_order}) for creds={credentials_key[:8]}... {bucket}/{prefix}"
            )

    def invalidate_bucket(self, bucket: str) -> None:
        """Invalidate all cache entries for a specific bucket.

        Called when objects are uploaded, deleted, or modified in the bucket.
        """
        with self._lock:
            keys = list(self._bucket_index.get(bucket, set()))
            for key in keys:
                self._cache.pop(key, None)
                self._remove_key(key)
            logger.debug(
                f"Invalidated {len(keys)} cache entr{'y' if len(keys)==1 else 'ies'} for bucket: {bucket}"
            )

    def invalidate_prefix(self, bucket: str, prefix: str) -> None:
        """Invalidate cache entries for a specific bucket and prefix.

        More granular than invalidate_bucket, but still clears entire cache for simplicity.
        """
        key = (bucket, prefix)
        with self._lock:
            keys = list(self._prefix_index.get(key, set()))
            for cache_key in keys:
                self._cache.pop(cache_key, None)
                self._remove_key(cache_key)
            logger.debug(
                f"Invalidated {len(keys)} cache entr{'y' if len(keys)==1 else 'ies'} for {bucket}/{prefix}"
            )

    def clear(self) -> None:
        """Clear all cache entries."""
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0
            self._bucket_index.clear()
            self._prefix_index.clear()
            self._key_index.clear()
            logger.info("Cache cleared")

    def stats(self) -> dict[str, int | float]:
        """Get cache statistics."""
        with self._lock:
            total = self._hits + self._misses
            hit_rate = (self._hits / total * 100) if total > 0 else 0.0
            return {
                "hits": self._hits,
                "misses": self._misses,
                "total_requests": total,
                "hit_rate_percent": round(hit_rate, 2),
                "cached_entries": len(self._cache),
                "max_size": self._cache.maxsize,
            }

    def _register_key(self, key: str, bucket: str, prefix: str) -> None:
        self._key_index[key] = (bucket, prefix)
        self._bucket_index.setdefault(bucket, set()).add(key)
        self._prefix_index.setdefault((bucket, prefix), set()).add(key)

    def _remove_key(self, key: str) -> None:
        info = self._key_index.pop(key, None)
        if info is None:
            return
        bucket, prefix = info
        bucket_keys = self._bucket_index.get(bucket)
        if bucket_keys is not None:
            bucket_keys.discard(key)
            if not bucket_keys:
                self._bucket_index.pop(bucket, None)
        prefix_keys = self._prefix_index.get((bucket, prefix))
        if prefix_keys is not None:
            prefix_keys.discard(key)
            if not prefix_keys:
                self._prefix_index.pop((bucket, prefix), None)


__all__ = ["ListObjectsCache", "CachedListing", "VariantLookup"]
