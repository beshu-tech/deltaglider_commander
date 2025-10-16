"""Shared helpers for DeltaGlider SDK adapters."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, datetime

from ..models import BucketSnapshot, LogicalObject


class BaseDeltaGliderAdapter:
    """Utility mixin exposing common helpers for adapter implementations."""

    @staticmethod
    def _normalize_key(key: str) -> str:
        """Strip leading slashes to keep keys consistent across adapters."""

        return key.lstrip("/")

    @staticmethod
    def _normalize_prefix(prefix: str) -> str:
        """Normalize object prefixes for S3-compatible listings."""

        return prefix.lstrip("/")

    @staticmethod
    def _build_snapshot(
        bucket: str,
        objects: Iterable[LogicalObject],
        *,
        computed_at: datetime | None = None,
    ) -> BucketSnapshot:
        """Aggregate object statistics into a ``BucketSnapshot``."""

        object_list = list(objects)
        total_original = sum(obj.original_bytes for obj in object_list)
        total_stored = sum(obj.stored_bytes for obj in object_list)
        savings_pct = 0.0
        if total_original:
            ratio = 1.0 - (total_stored / total_original)
            savings_pct = max(0.0, min(100.0, ratio * 100.0))

        return BucketSnapshot(
            name=bucket,
            object_count=len(object_list),
            original_bytes=total_original,
            stored_bytes=total_stored,
            savings_pct=savings_pct,
            computed_at=computed_at or datetime.now(UTC),
            object_count_is_limited=False,
        )


__all__ = ["BaseDeltaGliderAdapter"]
