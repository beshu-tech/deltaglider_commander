"""Data models for DeltaGlider SDK integration."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


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
    object_count_is_limited: bool = False


@dataclass(slots=True)
class ObjectListing:
    """Result of listing objects in a bucket."""

    objects: list[LogicalObject]
    common_prefixes: list[str]


class StatsMode(str, Enum):
    """Supported bucket statistics modes."""

    quick = "quick"
    sampled = "sampled"
    detailed = "detailed"


@dataclass(slots=True)
class FileMetadata:
    """Metadata describing an object stored through DeltaGlider."""

    key: str
    original_bytes: int
    stored_bytes: int
    compressed: bool
    modified: datetime
    accept_ranges: bool
    content_type: str | None = None
    etag: str | None = None
    metadata: dict | None = None

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "original_bytes": self.original_bytes,
            "stored_bytes": self.stored_bytes,
            "compressed": self.compressed,
            "modified": self.modified.isoformat().replace("+00:00", "Z"),
            "accept_ranges": self.accept_ranges,
            "content_type": self.content_type,
            "etag": self.etag,
            "metadata": self.metadata or {},
        }


@dataclass(slots=True)
class UploadSummary:
    """Summary returned after uploading an object."""

    bucket: str
    key: str
    original_bytes: int
    stored_bytes: int
    compressed: bool
    operation: str
    physical_key: str | None = None
    relative_path: str | None = None

    @property
    def savings_bytes(self) -> int:
        return max(self.original_bytes - self.stored_bytes, 0)

    @property
    def savings_pct(self) -> float:
        if self.original_bytes == 0:
            return 0.0
        return (self.savings_bytes / self.original_bytes) * 100.0

    def to_dict(self) -> dict:
        data = {
            "bucket": self.bucket,
            "key": self.key,
            "original_bytes": self.original_bytes,
            "stored_bytes": self.stored_bytes,
            "compressed": self.compressed,
            "operation": self.operation,
            "savings_bytes": self.savings_bytes,
            "savings_pct": self.savings_pct,
        }
        if self.physical_key:
            data["physical_key"] = self.physical_key
        if self.relative_path:
            data["relative_path"] = self.relative_path
        return data


__all__ = ["BucketSnapshot", "FileMetadata", "LogicalObject", "ObjectListing", "StatsMode", "UploadSummary"]
