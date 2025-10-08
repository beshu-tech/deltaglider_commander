"""TTL-aware caches used across the service layer."""

from __future__ import annotations

import threading
import time
from collections.abc import Hashable, Iterable
from dataclasses import dataclass
from typing import Any, Generic, TypeVar

from cachetools import TTLCache

K = TypeVar("K", bound=Hashable)
V = TypeVar("V")


class ThreadSafeTTLCache(Generic[K, V]):
    """Wrapper around cachetools.TTLCache with locking semantics."""

    def __init__(self, maxsize: int, ttl_seconds: float, *, enabled: bool = True) -> None:
        self._enabled = enabled
        self._cache: TTLCache[K, V] | None = TTLCache(maxsize=maxsize, ttl=ttl_seconds) if enabled else None
        self._lock = threading.RLock()
        self._maxsize = maxsize
        self._ttl = ttl_seconds

    def get(self, key: K) -> V | None:
        if not self._enabled:
            return None
        with self._lock:
            if self._cache is None:
                raise RuntimeError("Cache is enabled but not initialized")
            return self._cache.get(key)

    def set(self, key: K, value: V) -> None:
        if not self._enabled:
            return
        with self._lock:
            if self._cache is None:
                raise RuntimeError("Cache is enabled but not initialized")
            self._cache[key] = value

    def pop(self, key: K) -> V | None:
        if not self._enabled:
            return None
        with self._lock:
            if self._cache is None:
                raise RuntimeError("Cache is enabled but not initialized")
            return self._cache.pop(key, None)

    def clear(self) -> None:
        if not self._enabled:
            return
        with self._lock:
            if self._cache is None:
                raise RuntimeError("Cache is enabled but not initialized")
            self._cache.clear()

    def expire(self) -> None:
        """Force expiration of stale entries."""
        if not self._enabled:
            return
        with self._lock:
            if self._cache is None:
                raise RuntimeError("Cache is enabled but not initialized")
            self._cache.expire()

    def keys(self) -> Iterable[K]:
        if not self._enabled:
            return []
        with self._lock:
            if self._cache is None:
                raise RuntimeError("Cache is enabled but not initialized")
            return list(self._cache.keys())

    def stats(self) -> dict[str, Any]:
        """Return best-effort metrics for observability."""
        if not self._enabled:
            return {"currsize": 0, "maxsize": self._maxsize, "ttl": self._ttl, "enabled": False}
        with self._lock:
            if self._cache is None:
                raise RuntimeError("Cache is enabled but not initialized")
            return {
                "currsize": self._cache.currsize,
                "maxsize": self._cache.maxsize,
                "ttl": self._cache.ttl,
                "enabled": True,
            }


@dataclass(slots=True)
class CacheRegistry:
    list_cache: ThreadSafeTTLCache[Any, Any]
    meta_cache: ThreadSafeTTLCache[Any, Any]
    savings_cache: ThreadSafeTTLCache[Any, Any]
    pending_jobs: dict[str, float]
    lock: threading.RLock

    def mark_pending(self, bucket: str) -> None:
        with self.lock:
            self.pending_jobs[bucket] = time.time()

    def clear_pending(self, bucket: str) -> None:
        with self.lock:
            self.pending_jobs.pop(bucket, None)

    def is_pending(self, bucket: str) -> bool:
        with self.lock:
            return bucket in self.pending_jobs


def build_cache_registry(*, enabled: bool = True) -> CacheRegistry:
    return CacheRegistry(
        list_cache=ThreadSafeTTLCache(maxsize=100, ttl_seconds=30.0, enabled=enabled),
        meta_cache=ThreadSafeTTLCache(maxsize=5000, ttl_seconds=300.0, enabled=enabled),
        savings_cache=ThreadSafeTTLCache(maxsize=1000, ttl_seconds=900.0, enabled=enabled),
        pending_jobs={},
        lock=threading.RLock(),
    )
