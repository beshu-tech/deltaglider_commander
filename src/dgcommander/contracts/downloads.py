"""Download-related API contracts."""

from __future__ import annotations

from pydantic import BaseModel, Field

from .base import BaseContract


class DownloadPreparation(BaseContract):
    """Download preparation response."""

    download_token: str
    estimated_bytes: int = Field(ge=0)
    expires_at: str | None = None
    content_type: str | None = None
    file_name: str | None = None


class PrepareDownloadRequest(BaseModel):
    """Request to prepare a download."""

    bucket: str
    key: str
    expires_in_seconds: int = Field(default=300, ge=60, le=3600)
    force_download: bool = True  # Force download vs inline display

    @property
    def cache_key(self) -> str:
        """Generate cache key for this request."""
        return f"{self.bucket}:{self.key}:{self.expires_in_seconds}"


class StreamingDownloadRequest(BaseModel):
    """Request for streaming download."""

    bucket: str
    key: str
    chunk_size: int = Field(default=8192, ge=1024, le=1048576)  # 1KB to 1MB
    range_start: int | None = None
    range_end: int | None = None

    @property
    def has_range(self) -> bool:
        """Check if range is specified."""
        return self.range_start is not None or self.range_end is not None


class DownloadMetrics(BaseContract):
    """Download operation metrics."""

    bytes_transferred: int = Field(ge=0)
    duration_seconds: float = Field(ge=0)
    transfer_rate_mbps: float = Field(ge=0)
    compression_ratio: float = Field(ge=0, le=1)
    cache_hit: bool = False
