"""Domain data structures shared across the service layer."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from ..sdk import FileMetadata, UploadSummary
from ..shared.object_sort_order import ObjectSortOrder


@dataclass(slots=True)
class BucketStats:
    name: str
    object_count: int
    original_bytes: int
    stored_bytes: int
    savings_pct: float
    pending: bool = False
    computed_at: datetime | None = None
    stats_mode: str = "quick"
    stats_loaded: bool = False
    object_count_is_limited: bool = False


@dataclass(slots=True)
class ObjectItem:
    key: str
    original_bytes: int
    stored_bytes: int
    compressed: bool
    modified: datetime

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "original_bytes": self.original_bytes,
            "stored_bytes": self.stored_bytes,
            "compressed": self.compressed,
            "modified": self.modified.isoformat().replace("+00:00", "Z"),
        }


@dataclass(slots=True)
class ObjectList:
    objects: list[ObjectItem]
    common_prefixes: list[str]
    cursor: str | None = None
    limited: bool = False

    def to_dict(self) -> dict:
        data = {
            "objects": [item.to_dict() for item in self.objects],
            "common_prefixes": self.common_prefixes,
        }
        if self.cursor:
            data["cursor"] = self.cursor
        return data


@dataclass(slots=True)
class PresignedUrlResponse:
    bucket: str
    key: str
    download_url: str
    expires_in: int
    expires_at: int
    estimated_bytes: int

    def to_dict(self) -> dict:
        return {
            "bucket": self.bucket,
            "key": self.key,
            "download_url": self.download_url,
            "expires_in": self.expires_in,
            "expires_at": self.expires_at,
            "estimated_bytes": self.estimated_bytes,
        }


__all__ = [
    "BucketStats",
    "PresignedUrlResponse",
    "FileMetadata",
    "ObjectItem",
    "ObjectList",
    "ObjectSortOrder",
    "UploadSummary",
]
