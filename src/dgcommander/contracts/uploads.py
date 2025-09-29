"""Upload-related API contracts."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from .base import BaseContract


class UploadResult(BaseContract):
    """Result of a single file upload."""
    bucket: str
    key: str
    original_bytes: int = Field(ge=0)
    stored_bytes: int = Field(ge=0)
    compressed: bool
    operation: str
    savings_bytes: int = Field(ge=0)
    savings_pct: float = Field(ge=0, le=100)
    physical_key: Optional[str] = None
    relative_path: Optional[str] = None
    compression_strategy: Optional[str] = None
    file_type: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class UploadStats(BaseContract):
    """Statistics for batch upload operation."""
    count: int = Field(ge=0)
    original_bytes: int = Field(ge=0)
    stored_bytes: int = Field(ge=0)
    savings_bytes: int = Field(ge=0)
    savings_pct: float = Field(ge=0, le=100)
    average_compression_ratio: float = Field(ge=0, le=1)
    processing_time_seconds: Optional[float] = None


class UploadResponse(BaseContract):
    """Response for upload operations."""
    bucket: str
    prefix: str = ""
    results: List[UploadResult]
    stats: UploadStats
    failed: List[UploadError] = Field(default_factory=list)

    @property
    def success_rate(self) -> float:
        """Calculate success rate."""
        total = len(self.results) + len(self.failed)
        if total == 0:
            return 100.0
        return (len(self.results) / total) * 100.0


class UploadError(BaseModel):
    """Error information for failed uploads."""
    file_name: str
    error_code: str
    error_message: str
    details: Optional[dict] = None


class UploadRequest(BaseModel):
    """Request for file upload."""
    bucket: str
    prefix: str = ""
    enable_compression: bool = True
    compression_strategy: str = "auto"
    tags: dict = Field(default_factory=dict)
    metadata: dict = Field(default_factory=dict)

    @field_validator('prefix')
    @classmethod
    def normalize_prefix(cls, v: str) -> str:
        """Normalize prefix path."""
        if not v:
            return ""
        # Remove leading/trailing slashes and sanitize
        normalized = v.strip().strip("/")
        # Remove any path traversal attempts
        segments = [s for s in normalized.split("/") if s and s not in {".", ".."}]
        return "/".join(segments)

    @field_validator('compression_strategy')
    @classmethod
    def validate_strategy(cls, v: str) -> str:
        """Validate compression strategy."""
        valid_strategies = {"auto", "delta", "standard", "skip", "smart"}
        if v.lower() not in valid_strategies:
            raise ValueError(f"Invalid compression strategy. Must be one of: {valid_strategies}")
        return v.lower()


class BatchUploadRequest(BaseModel):
    """Request for batch file upload."""
    bucket: str
    prefix: str = ""
    parallel_uploads: int = Field(default=4, ge=1, le=10)
    enable_compression: bool = True
    optimize_by_type: bool = True
    tags: dict = Field(default_factory=dict)
    metadata: dict = Field(default_factory=dict)


class UploadProgressUpdate(BaseModel):
    """Progress update for upload operations."""
    upload_id: str
    file_name: str
    bytes_uploaded: int
    total_bytes: int
    percentage: float = Field(ge=0, le=100)
    status: str  # "pending", "uploading", "compressing", "completed", "failed"
    error: Optional[str] = None

    @property
    def is_complete(self) -> bool:
        """Check if upload is complete."""
        return self.status in {"completed", "failed"}