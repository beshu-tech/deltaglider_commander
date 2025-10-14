"""Thread-safe cache for bucket statistics."""

from __future__ import annotations

import threading
from collections.abc import Iterable

from ..models import BucketSnapshot


class BucketStatsCache:
    """Simple in-memory cache keyed by bucket name with thread safety."""

    def __init__(self) -> None:
        self._snapshots: dict[str, BucketSnapshot] = {}
        self._lock = threading.RLock()

    def drop_missing(self, current_buckets: Iterable[str]) -> None:
        """Remove cache entries for buckets that no longer exist."""

        with self._lock:
            missing = set(self._snapshots) - set(current_buckets)
            for bucket in missing:
                self._snapshots.pop(bucket, None)

    def put(self, snapshot: BucketSnapshot) -> None:
        """Store or update a snapshot."""

        with self._lock:
            self._snapshots[snapshot.name] = snapshot

    def get(self, name: str) -> BucketSnapshot | None:
        """Return cached snapshot if available."""

        with self._lock:
            return self._snapshots.get(name)

    def remove(self, name: str) -> None:
        """Remove a bucket from the cache."""

        with self._lock:
            self._snapshots.pop(name, None)


__all__ = ["BucketStatsCache"]
