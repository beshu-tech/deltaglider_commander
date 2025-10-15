"""Domain data structures shared across the service layer."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from ..sdk import FileMetadata, UploadSummary


class ObjectSortOrder(str, Enum):
    name_asc = "name_asc"
    name_desc = "name_desc"
    modified_desc = "modified_desc"
    modified_asc = "modified_asc"
    size_asc = "size_asc"
    size_desc = "size_desc"

    @classmethod
    def from_query(cls, sort: str | None, direction: str | None) -> ObjectSortOrder:
        if not sort:
            return cls.modified_desc
        key = sort.lower()
        dir_normalized = (direction or "desc").lower()
        if key in {"name", "key"}:
            return cls.name_desc if dir_normalized == "desc" else cls.name_asc
        if key in {"size", "original_bytes"}:
            return cls.size_desc if dir_normalized == "desc" else cls.size_asc
        if key == "modified":
            return cls.modified_desc if dir_normalized == "desc" else cls.modified_asc
        return cls.modified_desc


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

    def to_dict(self) -> dict:
        data = {
            "objects": [item.to_dict() for item in self.objects],
            "common_prefixes": self.common_prefixes,
        }
        if self.cursor:
            data["cursor"] = self.cursor
        return data


@dataclass(slots=True)
class DownloadPreparation:
    bucket: str
    key: str
    download_token: str
    estimated_bytes: int

    def to_dict(self) -> dict:
        return {
            "download_token": self.download_token,
            "estimated_bytes": self.estimated_bytes,
        }


__all__ = [
    "BucketStats",
    "DownloadPreparation",
    "FileMetadata",
    "ObjectItem",
    "ObjectList",
    "ObjectSortOrder",
    "UploadSummary",
]
