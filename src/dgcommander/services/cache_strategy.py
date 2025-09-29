"""Intelligent caching strategy with dependency tracking."""

from __future__ import annotations

import asyncio
import builtins
import hashlib
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass
from enum import Enum
from typing import Any

from cachetools import LRUCache, TTLCache


class CacheLevel(Enum):
    """Cache levels for different data types."""

    METADATA = "metadata"  # Object metadata, high hit rate
    LISTING = "listing"  # Directory listings, moderate hit rate
    CONTENT = "content"  # File content, low hit rate
    STATS = "stats"  # Bucket statistics, moderate hit rate
    SYSTEM = "system"  # System-wide data, high hit rate


@dataclass
class CacheEntry:
    """Cache entry with metadata."""

    key: str
    value: Any
    level: CacheLevel
    created_at: float
    accessed_at: float
    access_count: int
    size_bytes: int
    dependencies: set[str]
    tags: dict[str, str]

    def touch(self):
        """Update access time and count."""
        self.accessed_at = time.time()
        self.access_count += 1


@dataclass
class CacheStats:
    """Cache statistics."""

    total_entries: int
    total_size_bytes: int
    hit_rate: float
    miss_rate: float
    eviction_count: int
    avg_entry_age_seconds: float
    entries_by_level: dict[CacheLevel, int]


class DependencyGraph:
    """Track cache entry dependencies for intelligent invalidation."""

    def __init__(self):
        self._forward_deps: dict[str, set[str]] = {}  # key -> dependencies
        self._reverse_deps: dict[str, set[str]] = {}  # key -> dependents
        self._lock = asyncio.Lock()

    async def add_dependency(self, key: str, depends_on: str):
        """Add a dependency relationship."""
        async with self._lock:
            # Forward dependency
            if key not in self._forward_deps:
                self._forward_deps[key] = set()
            self._forward_deps[key].add(depends_on)

            # Reverse dependency
            if depends_on not in self._reverse_deps:
                self._reverse_deps[depends_on] = set()
            self._reverse_deps[depends_on].add(key)

    async def get_affected(self, key: str) -> set[str]:
        """Get all cache entries affected by invalidating this key."""
        async with self._lock:
            affected = {key}
            to_process = [key]

            while to_process:
                current = to_process.pop()
                dependents = self._reverse_deps.get(current, set())

                for dependent in dependents:
                    if dependent not in affected:
                        affected.add(dependent)
                        to_process.append(dependent)

            return affected

    async def remove_key(self, key: str):
        """Remove a key from the dependency graph."""
        async with self._lock:
            # Remove forward dependencies
            if key in self._forward_deps:
                for dep in self._forward_deps[key]:
                    if dep in self._reverse_deps:
                        self._reverse_deps[dep].discard(key)
                del self._forward_deps[key]

            # Remove reverse dependencies
            if key in self._reverse_deps:
                for dependent in self._reverse_deps[key]:
                    if dependent in self._forward_deps:
                        self._forward_deps[dependent].discard(key)
                del self._reverse_deps[key]


class IntelligentCache:
    """Intelligent cache with multi-level storage and dependency tracking."""

    def __init__(self):
        # Different cache levels with different policies
        self._metadata_cache = LRUCache(maxsize=10000)  # High capacity for metadata
        self._listing_cache = TTLCache(maxsize=1000, ttl=30)  # Short TTL for listings
        self._content_cache = LRUCache(maxsize=100)  # Limited capacity for content
        self._stats_cache = TTLCache(maxsize=500, ttl=300)  # Moderate TTL for stats

        # Cache metadata tracking
        self._entries: dict[str, CacheEntry] = {}
        self._dependency_graph = DependencyGraph()

        # Statistics
        self._hits = 0
        self._misses = 0
        self._evictions = 0

        # Locks
        self._lock = asyncio.Lock()

    async def get(self, key: str, level: CacheLevel = CacheLevel.METADATA) -> Any | None:
        """Get value from cache."""
        async with self._lock:
            cache = self._get_cache_for_level(level)

            if key in cache:
                self._hits += 1
                # Update entry metadata
                if key in self._entries:
                    self._entries[key].touch()
                return cache[key]

            self._misses += 1
            return None

    async def set(
        self,
        key: str,
        value: Any,
        level: CacheLevel = CacheLevel.METADATA,
        dependencies: builtins.set[str] | None = None,
        tags: dict[str, str] | None = None,
    ):
        """Set value in cache with metadata."""
        async with self._lock:
            cache = self._get_cache_for_level(level)

            # Calculate size (approximate)
            size = len(str(value))

            # Store in appropriate cache
            cache[key] = value

            # Create entry metadata
            entry = CacheEntry(
                key=key,
                value=value,
                level=level,
                created_at=time.time(),
                accessed_at=time.time(),
                access_count=0,
                size_bytes=size,
                dependencies=dependencies or set(),
                tags=tags or {},
            )
            self._entries[key] = entry

            # Add dependencies
            if dependencies:
                for dep in dependencies:
                    await self._dependency_graph.add_dependency(key, dep)

    async def invalidate(self, key: str, cascade: bool = True):
        """Invalidate cache entry and optionally cascade to dependents."""
        async with self._lock:
            if cascade:
                # Get all affected entries
                affected = await self._dependency_graph.get_affected(key)
            else:
                affected = {key}

            # Remove all affected entries
            for affected_key in affected:
                await self._remove_entry(affected_key)

    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern."""
        async with self._lock:
            count = 0
            keys_to_remove = []

            for key in self._entries:
                if self._matches_pattern(key, pattern):
                    keys_to_remove.append(key)

            for key in keys_to_remove:
                await self._remove_entry(key)
                count += 1

            return count

    async def invalidate_by_tag(self, tag_key: str, tag_value: str | None = None) -> int:
        """Invalidate all entries with specific tag."""
        async with self._lock:
            count = 0
            keys_to_remove = []

            for key, entry in self._entries.items():
                if tag_key in entry.tags:
                    if tag_value is None or entry.tags[tag_key] == tag_value:
                        keys_to_remove.append(key)

            for key in keys_to_remove:
                await self._remove_entry(key)
                count += 1

            return count

    async def stream_with_cache(self, key: str, fetch_func, chunk_size: int = 8192) -> AsyncIterator[bytes]:
        """Stream data with intelligent caching of chunks."""
        # Check if we have the full content cached
        cached_content = await self.get(key, CacheLevel.CONTENT)
        if cached_content:
            # Stream from cache
            for i in range(0, len(cached_content), chunk_size):
                yield cached_content[i : i + chunk_size]
            return

        # Stream from source and cache chunks
        chunks = []
        async for chunk in fetch_func(key, chunk_size):
            chunks.append(chunk)
            yield chunk

        # Cache the full content if it's not too large
        full_content = b"".join(chunks)
        if len(full_content) < 10 * 1024 * 1024:  # Cache if < 10MB
            await self.set(key, full_content, CacheLevel.CONTENT)

    def calculate_optimal_chunk_size(self, file_size: int) -> int:
        """Calculate optimal chunk size based on file size."""
        if file_size < 1024 * 1024:  # < 1MB
            return 8192  # 8KB chunks
        elif file_size < 10 * 1024 * 1024:  # < 10MB
            return 65536  # 64KB chunks
        elif file_size < 100 * 1024 * 1024:  # < 100MB
            return 262144  # 256KB chunks
        else:
            return 1048576  # 1MB chunks

    async def get_stats(self) -> CacheStats:
        """Get cache statistics."""
        async with self._lock:
            total_entries = len(self._entries)
            total_size = sum(e.size_bytes for e in self._entries.values())

            hit_rate = self._hits / (self._hits + self._misses) if (self._hits + self._misses) > 0 else 0
            miss_rate = 1 - hit_rate

            entries_by_level = {}
            total_age = 0
            now = time.time()

            for entry in self._entries.values():
                level = entry.level
                entries_by_level[level] = entries_by_level.get(level, 0) + 1
                total_age += now - entry.created_at

            avg_age = total_age / total_entries if total_entries > 0 else 0

            return CacheStats(
                total_entries=total_entries,
                total_size_bytes=total_size,
                hit_rate=hit_rate,
                miss_rate=miss_rate,
                eviction_count=self._evictions,
                avg_entry_age_seconds=avg_age,
                entries_by_level=entries_by_level,
            )

    async def clear(self):
        """Clear all caches."""
        async with self._lock:
            self._metadata_cache.clear()
            self._listing_cache.clear()
            self._content_cache.clear()
            self._stats_cache.clear()
            self._entries.clear()
            self._dependency_graph = DependencyGraph()

    def _get_cache_for_level(self, level: CacheLevel):
        """Get the appropriate cache for a level."""
        if level == CacheLevel.METADATA:
            return self._metadata_cache
        elif level == CacheLevel.LISTING:
            return self._listing_cache
        elif level == CacheLevel.CONTENT:
            return self._content_cache
        elif level == CacheLevel.STATS:
            return self._stats_cache
        else:
            return self._metadata_cache

    async def _remove_entry(self, key: str):
        """Remove entry from all caches."""
        if key in self._entries:
            entry = self._entries[key]
            cache = self._get_cache_for_level(entry.level)

            if key in cache:
                del cache[key]
                self._evictions += 1

            del self._entries[key]
            await self._dependency_graph.remove_key(key)

    def _matches_pattern(self, key: str, pattern: str) -> bool:
        """Check if key matches pattern (simple wildcard support)."""
        import fnmatch

        return fnmatch.fnmatch(key, pattern)


class CacheKey:
    """Helper for generating consistent cache keys."""

    @staticmethod
    def for_object(bucket: str, key: str) -> str:
        """Generate cache key for object."""
        return f"object:{bucket}:{key}"

    @staticmethod
    def for_listing(bucket: str, prefix: str, **params) -> str:
        """Generate cache key for listing."""
        param_str = ":".join(f"{k}={v}" for k, v in sorted(params.items()))
        return f"listing:{bucket}:{prefix}:{param_str}"

    @staticmethod
    def for_bucket(bucket: str) -> str:
        """Generate cache key for bucket."""
        return f"bucket:{bucket}"

    @staticmethod
    def for_stats(bucket: str) -> str:
        """Generate cache key for stats."""
        return f"stats:{bucket}"

    @staticmethod
    def hash_key(key: str) -> str:
        """Generate hashed version of key for compact storage."""
        return hashlib.sha256(key.encode()).hexdigest()[:16]
