"""Cache for object listing results to improve performance."""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
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


@dataclass(frozen=True, slots=True)
class CachedListing:
    """Immutable cached listing result."""

    objects: tuple[LogicalObject, ...]
    common_prefixes: tuple[str, ...]

    @classmethod
    def from_lists(cls, objects: list[LogicalObject], common_prefixes: list[str]) -> CachedListing:
        """Create from mutable lists."""
        return cls(objects=tuple(objects), common_prefixes=tuple(common_prefixes))

    def to_lists(self) -> tuple[list[LogicalObject], list[str]]:
        """Convert to mutable lists."""
        return list(self.objects), list(self.common_prefixes)


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
        logger.info(f"Initialized ListObjectsCache with ttl={ttl_seconds}s, max_size={max_size}")

    def _make_key(
        self,
        credentials_key: str,
        bucket: str,
        prefix: str,
        sort_order: str,
        compressed: bool | None,
        search: str | None,
    ) -> str:
        """Generate cache key from listing parameters.

        SECURITY: credentials_key is included to isolate cache entries per credential set.
        This prevents data leakage between users with different S3 credentials, while allowing
        cache sharing across sessions/browsers with the same credentials.
        """
        # Create a stable key from parameters, INCLUDING credentials_key for isolation
        key_parts = [
            credentials_key,  # CRITICAL: Isolate by credentials (not session)
            bucket,
            prefix,
            sort_order,
            str(compressed) if compressed is not None else "all",
            search or "",
        ]
        key_str = "|".join(key_parts)
        # Use hash for shorter keys
        return hashlib.sha256(key_str.encode()).hexdigest()[:16]

    def get(
        self,
        credentials_key: str,
        bucket: str,
        prefix: str,
        sort_order: str,
        compressed: bool | None,
        search: str | None,
    ) -> CachedListing | None:
        """Retrieve cached listing if available.

        Args:
            credentials_key: Hash of credentials for cache isolation (security)
            bucket: S3 bucket name
            prefix: Object key prefix
            sort_order: Sort order string
            compressed: Filter by compression status
            search: Search filter string

        Returns:
            CachedListing if cache hit, None if cache miss
        """
        key = self._make_key(credentials_key, bucket, prefix, sort_order, compressed, search)
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

    def set(
        self,
        credentials_key: str,
        bucket: str,
        prefix: str,
        sort_order: str,
        compressed: bool | None,
        search: str | None,
        objects: list[LogicalObject],
        common_prefixes: list[str],
    ) -> None:
        """Store listing result in cache.

        Args:
            credentials_key: Hash of credentials for cache isolation (security)
            bucket: S3 bucket name
            prefix: Object key prefix
            sort_order: Sort order string
            compressed: Filter by compression status
            search: Search filter string
            objects: List of objects to cache
            common_prefixes: List of common prefixes to cache
        """
        key = self._make_key(credentials_key, bucket, prefix, sort_order, compressed, search)
        cached = CachedListing.from_lists(objects, common_prefixes)
        with self._lock:
            self._cache[key] = cached
            logger.debug(f"Cached {len(objects)} objects for creds={credentials_key[:8]}... {bucket}/{prefix}")

    def invalidate_bucket(self, bucket: str) -> None:
        """Invalidate all cache entries for a specific bucket.

        Called when objects are uploaded, deleted, or modified in the bucket.
        """
        with self._lock:
            # Find and remove all keys for this bucket
            keys_to_remove = []
            for key in list(self._cache.keys()):
                # We need to check if this key belongs to the bucket
                # Since keys are hashed, we'll need to clear the entire cache for simplicity
                # A more sophisticated approach would maintain a bucket -> keys mapping
                keys_to_remove.append(key)

            # For now, clear entire cache when any bucket is modified
            # This is simple and safe, though not optimal
            self._cache.clear()
            logger.info(f"Invalidated entire cache due to modification in bucket: {bucket}")

    def invalidate_prefix(self, bucket: str, prefix: str) -> None:
        """Invalidate cache entries for a specific bucket and prefix.

        More granular than invalidate_bucket, but still clears entire cache for simplicity.
        """
        # For simplicity, invalidate entire cache
        # TODO: Maintain bucket/prefix -> key mapping for granular invalidation
        self.invalidate_bucket(bucket)

    def clear(self) -> None:
        """Clear all cache entries."""
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0
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


__all__ = ["ListObjectsCache", "CachedListing"]
