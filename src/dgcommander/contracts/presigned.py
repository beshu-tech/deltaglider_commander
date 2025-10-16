"""Presigned URL contracts."""

from typing import Literal

from pydantic import BaseModel

from .base import BaseContract


class PresignedUrlRequest(BaseModel):
    """Request for generating a presigned URL."""

    bucket: str
    key: str
    expires_in: int = 3600  # Default 1 hour
    with_rehydration: bool = True

    def cache_key(self) -> str:
        """Generate cache key for this request."""
        return f"{self.bucket}:{self.key}:{self.expires_in}"


class PresignedUrlResponse(BaseContract):
    """Response containing presigned URL information."""

    bucket: str
    key: str
    download_url: str
    expires_in: int
    expires_at: int  # Unix timestamp
    estimated_bytes: int | None = None
    operation: Literal["presigned_url"] = "presigned_url"
