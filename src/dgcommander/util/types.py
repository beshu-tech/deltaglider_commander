"""Domain data structures shared across the service layer."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import List, Optional


class ObjectSortOrder(str, Enum):
    name_asc = "name_asc"
    name_desc = "name_desc"
    modified_desc = "modified_desc"
    modified_asc = "modified_asc"
    size_asc = "size_asc"
    size_desc = "size_desc"

    @classmethod
    def from_query(cls, sort: Optional[str], direction: Optional[str]) -> "ObjectSortOrder":
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
    computed_at: Optional[datetime] = None


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
    objects: List[ObjectItem]
    common_prefixes: List[str]
    cursor: Optional[str] = None

    def to_dict(self) -> dict:
        data = {
            "objects": [item.to_dict() for item in self.objects],
            "common_prefixes": self.common_prefixes,
        }
        if self.cursor:
            data["cursor"] = self.cursor
        return data


@dataclass(slots=True)
class FileMetadata:
    key: str
    original_bytes: int
    stored_bytes: int
    compressed: bool
    modified: datetime
    accept_ranges: bool

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "original_bytes": self.original_bytes,
            "stored_bytes": self.stored_bytes,
            "compressed": self.compressed,
            "modified": self.modified.isoformat().replace("+00:00", "Z"),
            "accept_ranges": self.accept_ranges,
        }


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


@dataclass(slots=True)
class UploadSummary:
    bucket: str
    key: str
    original_bytes: int
    stored_bytes: int
    compressed: bool
    operation: str
    physical_key: Optional[str] = None
    relative_path: Optional[str] = None

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
