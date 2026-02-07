"""Thread-safe cache for bucket statistics with TTL expiry."""

from __future__ import annotations

import threading
import time
from collections.abc import Iterable

from ..models import BucketSnapshot

# Default TTL: 5 minutes
DEFAULT_TTL_SECONDS = 300


class BucketStatsCache:
    """In-memory cache keyed by bucket name with thread safety and TTL expiry."""

    def __init__(self, ttl_seconds: float = DEFAULT_TTL_SECONDS) -> None:
        self._snapshots: dict[str, BucketSnapshot] = {}
        self._timestamps: dict[str, float] = {}
        self._ttl_seconds = ttl_seconds
        self._lock = threading.RLock()

    def _is_expired(self, name: str) -> bool:
        ts = self._timestamps.get(name)
        if ts is None:
            return True
        return (time.monotonic() - ts) > self._ttl_seconds

    def drop_missing(self, current_buckets: Iterable[str]) -> None:
        """Remove cache entries for buckets that no longer exist."""

        with self._lock:
            missing = set(self._snapshots) - set(current_buckets)
            for bucket in missing:
                self._snapshots.pop(bucket, None)
                self._timestamps.pop(bucket, None)

    def put(self, snapshot: BucketSnapshot) -> None:
        """Store or update a snapshot."""

        with self._lock:
            self._snapshots[snapshot.name] = snapshot
            self._timestamps[snapshot.name] = time.monotonic()

    def get(self, name: str) -> BucketSnapshot | None:
        """Return cached snapshot if available and not expired."""

        with self._lock:
            if self._is_expired(name):
                self._snapshots.pop(name, None)
                self._timestamps.pop(name, None)
                return None
            return self._snapshots.get(name)

    def remove(self, name: str) -> None:
        """Remove a bucket from the cache."""

        with self._lock:
            self._snapshots.pop(name, None)
            self._timestamps.pop(name, None)

    def clear(self) -> None:
        """Remove all cached snapshots."""

        with self._lock:
            self._snapshots.clear()
            self._timestamps.clear()


__all__ = ["BucketStatsCache"]
