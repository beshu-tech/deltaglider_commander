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

    def __init__(self, maxsize: int, ttl_seconds: float) -> None:
        self._cache: TTLCache[K, V] = TTLCache(maxsize=maxsize, ttl=ttl_seconds)
        self._lock = threading.RLock()

    def get(self, key: K) -> V | None:
        with self._lock:
            return self._cache.get(key)

    def set(self, key: K, value: V) -> None:
        with self._lock:
            self._cache[key] = value

    def pop(self, key: K) -> V | None:
        with self._lock:
            return self._cache.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def expire(self) -> None:
        """Force expiration of stale entries."""
        with self._lock:
            self._cache.expire()

    def keys(self) -> Iterable[K]:
        with self._lock:
            return list(self._cache.keys())

    def stats(self) -> dict[str, Any]:
        """Return best-effort metrics for observability."""
        with self._lock:
            return {
                "currsize": self._cache.currsize,
                "maxsize": self._cache.maxsize,
                "ttl": self._cache.ttl,
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


def build_cache_registry() -> CacheRegistry:
    return CacheRegistry(
        list_cache=ThreadSafeTTLCache(maxsize=100, ttl_seconds=30.0),
        meta_cache=ThreadSafeTTLCache(maxsize=5000, ttl_seconds=300.0),
        savings_cache=ThreadSafeTTLCache(maxsize=1000, ttl_seconds=900.0),
        pending_jobs={},
        lock=threading.RLock(),
    )
