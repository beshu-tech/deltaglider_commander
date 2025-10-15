"""Bucket-related API contracts."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from .base import BaseContract


class BucketStats(BaseContract):
    """Bucket statistics and metadata."""

    name: str
    object_count: int = Field(ge=0)
    original_bytes: int = Field(ge=0)
    stored_bytes: int = Field(ge=0)
    savings_pct: float = Field(ge=0, le=100)
    pending: bool = False
    computed_at: datetime | None = None

    @property
    def total_savings_bytes(self) -> int:
        """Calculate total savings in bytes."""
        return max(self.original_bytes - self.stored_bytes, 0)

    @property
    def average_compression_ratio(self) -> float:
        """Calculate average compression ratio."""
        if self.original_bytes == 0:
            return 0.0
        return 1.0 - (self.stored_bytes / self.original_bytes)


class BucketListResponse(BaseContract):
    """Response for bucket listing."""

    buckets: list[BucketStats]
    total_buckets: int = 0
    total_objects: int = 0
    total_original_bytes: int = 0
    total_stored_bytes: int = 0

    def __init__(self, **data):
        """Initialize with computed totals."""
        super().__init__(**data)
        if self.buckets:
            self.total_buckets = len(self.buckets)
            self.total_objects = sum(b.object_count for b in self.buckets)
            self.total_original_bytes = sum(b.original_bytes for b in self.buckets)
            self.total_stored_bytes = sum(b.stored_bytes for b in self.buckets)

    @property
    def overall_savings_pct(self) -> float:
        """Calculate overall savings percentage."""
        if self.total_original_bytes == 0:
            return 0.0
        return ((self.total_original_bytes - self.total_stored_bytes) / self.total_original_bytes) * 100.0


class CreateBucketRequest(BaseModel):
    """Request to create a new bucket."""

    name: str
    region: str | None = "eu-west-1"
    tags: dict = Field(default_factory=dict)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate bucket name according to S3 rules."""
        name = v.strip()

        # S3 bucket naming rules
        if len(name) < 3 or len(name) > 63:
            raise ValueError("Bucket name must be between 3 and 63 characters")

        if not name.replace("-", "").replace(".", "").isalnum():
            raise ValueError("Bucket name can only contain lowercase letters, numbers, dots, and hyphens")

        if name.startswith("-") or name.endswith("-"):
            raise ValueError("Bucket name cannot start or end with a hyphen")

        if name.startswith(".") or name.endswith("."):
            raise ValueError("Bucket name cannot start or end with a dot")

        if ".." in name or ".-" in name or "-." in name:
            raise ValueError("Invalid character sequence in bucket name")

        # Check for IP address format (not allowed)
        parts = name.split(".")
        if len(parts) == 4 and all(p.isdigit() and 0 <= int(p) <= 255 for p in parts):
            raise ValueError("Bucket name cannot be formatted as an IP address")

        return name.lower()


class DeleteBucketRequest(BaseModel):
    """Request to delete a bucket."""

    name: str
    force: bool = False  # Force delete even if not empty

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate bucket name."""
        if not v or not v.strip():
            raise ValueError("Bucket name is required")
        return v.strip()


class ComputeSavingsRequest(BaseModel):
    """Request to compute savings for a bucket."""

    bucket: str
    force_recompute: bool = False
    include_metadata: bool = True
