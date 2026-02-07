"""Object-related API contracts."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from ..shared.object_sort_order import ObjectSortOrder as SharedObjectSortOrder
from .base import BaseContract


class ObjectItem(BaseContract):
    """Individual object in a listing."""

    key: str
    original_bytes: int = Field(ge=0)
    stored_bytes: int = Field(ge=0)
    compressed: bool
    modified: datetime

    @property
    def savings_bytes(self) -> int:
        """Calculate storage savings."""
        return max(self.original_bytes - self.stored_bytes, 0)

    @property
    def savings_pct(self) -> float:
        """Calculate savings percentage."""
        if self.original_bytes == 0:
            return 0.0
        return (self.savings_bytes / self.original_bytes) * 100.0


class ObjectListResponse(BaseContract):
    """Response for object listing."""

    objects: list[ObjectItem]
    common_prefixes: list[str] = Field(default_factory=list)
    cursor: str | None = None
    limited: bool = Field(default=False, description="True if object count was truncated at OBJECT_COUNT_LIMIT")


class ObjectListRequest(BaseModel):
    """Request parameters for object listing."""

    bucket: str
    prefix: str = ""
    search: str | None = None
    cursor: str | None = None
    limit: int = Field(default=100, ge=1, le=1000)
    sort: str | None = None
    order: str | None = None
    compressed: bool | None = None
    fetch_metadata: bool = True  # Default to True for backward compatibility
    bypass_cache: bool = False  # When True, skip backend list cache and fetch fresh from S3

    @field_validator("bucket")
    @classmethod
    def validate_bucket(cls, v: str) -> str:
        """Validate bucket name."""
        if not v or not v.strip():
            raise ValueError("Bucket name is required")
        return v.strip()

    @field_validator("prefix")
    @classmethod
    def normalize_prefix(cls, v: str) -> str:
        """Normalize prefix path."""
        if not v:
            return ""
        # Remove only leading slashes; preserve trailing slashes for S3 directory navigation
        normalized = v.strip().lstrip("/")
        return normalized

    @field_validator("cursor")
    @classmethod
    def normalize_cursor(cls, v: str | None) -> str | None:
        """Normalize cursor value - handle 'null' string from frontend."""
        if v == "null" or v == "":
            return None
        return v


class FileMetadata(BaseContract):
    """File metadata response."""

    key: str
    original_bytes: int = Field(ge=0)
    stored_bytes: int = Field(ge=0)
    compressed: bool
    modified: datetime
    accept_ranges: bool = False
    content_type: str | None = None
    etag: str | None = None
    metadata: dict = Field(default_factory=dict)

    @property
    def compression_ratio(self) -> float:
        """Calculate compression ratio."""
        if self.original_bytes == 0:
            return 0.0
        return 1.0 - (self.stored_bytes / self.original_bytes)


class DeleteObjectRequest(BaseModel):
    """Request to delete an object."""

    bucket: str
    key: str

    @field_validator("key")
    @classmethod
    def validate_key(cls, v: str) -> str:
        """Validate object key."""
        if not v or not v.strip():
            raise ValueError("Object key is required")
        # Normalize path
        return v.strip().lstrip("/")


class BulkDeleteRequest(BaseModel):
    """Request to delete multiple objects."""

    bucket: str
    keys: list[str] = Field(min_length=1, max_length=1000)

    @field_validator("keys")
    @classmethod
    def validate_keys(cls, v: list[str]) -> list[str]:
        """Validate object keys."""
        if not v:
            raise ValueError("At least one key is required")
        # Normalize and validate each key
        normalized = []
        for key in v:
            if not key or not key.strip():
                continue  # Skip empty keys
            normalized.append(key.strip().lstrip("/"))
        if not normalized:
            raise ValueError("At least one valid key is required")
        return normalized


class BulkDeleteResponse(BaseContract):
    """Response for bulk delete operation."""

    deleted: list[str] = Field(default_factory=list)
    errors: list[dict] = Field(default_factory=list)
    total_requested: int
    total_deleted: int
    total_errors: int


class ObjectMetadataUpdate(BaseModel):
    """Update object metadata."""

    metadata: dict = Field(default_factory=dict)
    tags: dict = Field(default_factory=dict)


# Re-export for backwards compatibility
ObjectSortOrder = SharedObjectSortOrder

__all__ = [
    "ObjectSortOrder",
    "ObjectItem",
    "ObjectListResponse",
    "ObjectListRequest",
    "FileMetadata",
    "DeleteObjectRequest",
    "BulkDeleteRequest",
    "BulkDeleteResponse",
    "ObjectMetadataUpdate",
]
