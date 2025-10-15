"""Protocol interface for DeltaGlider SDK implementations."""

from __future__ import annotations

import io
from collections.abc import Iterable
from typing import BinaryIO, Protocol

from .models import BucketSnapshot, FileMetadata, ObjectListing, StatsMode, UploadSummary


class DeltaGliderSDK(Protocol):
    """Interface that DeltaGlider SDK implementations must implement."""

    def list_buckets(self, compute_stats: bool = False) -> Iterable[BucketSnapshot]:
        """List all buckets with optional statistics computation."""
        ...

    def create_bucket(self, name: str) -> None:
        """Create a new bucket."""
        ...

    def delete_bucket(self, name: str) -> None:
        """Delete an existing bucket."""
        ...

    def bucket_exists(self, name: str) -> bool:
        """Check if a bucket exists."""
        ...

    def list_objects(
        self, bucket: str, prefix: str, max_items: int | None = None, quick_mode: bool = False
    ) -> ObjectListing:
        """List objects in a bucket with optional pagination and quick mode."""
        ...

    def get_metadata(self, bucket: str, key: str) -> FileMetadata:
        """Get metadata for a specific object."""
        ...

    def open_object_stream(self, bucket: str, key: str) -> io.BufferedReader:
        """Open a stream to read an object."""
        ...

    def estimated_object_size(self, bucket: str, key: str) -> int:
        """Get estimated size of an object."""
        ...

    def delete_object(self, bucket: str, key: str) -> None:
        """Delete a specific object."""
        ...

    def delete_objects(self, bucket: str, keys: list[str]) -> None:
        """Delete multiple objects."""
        ...

    def upload(self, bucket: str, key: str, file_obj: BinaryIO) -> UploadSummary:
        """Upload a file to a bucket."""
        ...

    def compute_bucket_stats(self, bucket: str, mode: StatsMode = StatsMode.detailed) -> BucketSnapshot:
        """Compute and return up-to-date statistics for a bucket."""
        ...


__all__ = ["DeltaGliderSDK"]
