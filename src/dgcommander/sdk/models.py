"""Data models for DeltaGlider SDK integration."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class LogicalObject:
    """Logical representation of a DeltaGlider object."""

    key: str
    original_bytes: int
    stored_bytes: int
    compressed: bool
    modified: datetime
    physical_key: str


@dataclass(slots=True)
class BucketSnapshot:
    """Snapshot of bucket statistics."""

    name: str
    object_count: int
    original_bytes: int
    stored_bytes: int
    savings_pct: float
    computed_at: datetime | None


@dataclass(slots=True)
class ObjectListing:
    """Result of listing objects in a bucket."""

    objects: list[LogicalObject]
    common_prefixes: list[str]


__all__ = ["BucketSnapshot", "LogicalObject", "ObjectListing"]
