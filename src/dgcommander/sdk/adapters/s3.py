"""S3-backed DeltaGlider SDK implementation."""

from __future__ import annotations

import io
import os
import tempfile
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import BinaryIO

from ...util.types import FileMetadata, UploadSummary
from ..models import BucketSnapshot, LogicalObject, ObjectListing


@dataclass(slots=True)
class S3Settings:
    """Configuration values for the S3-backed SDK."""

    endpoint_url: str | None = None
    region_name: str | None = None
    access_key_id: str | None = None
    secret_access_key: str | None = None
    session_token: str | None = None
    addressing_style: str = "path"
    verify: bool = True
    cache_dir: str | None = None


class S3DeltaGliderSDK:
    """
    SDK backed by the official deltaglider package.

    DeltaGlider 4.1.0+ provides complete S3 abstraction:
    - Intelligent file type detection
    - Automatic compression strategy selection
    - Delta compression for archives (99%+ compression)
    - Optimal handling per file type
    - Object operations (put, get, delete, list)
    - Bucket management (list, create, delete)
    - Complete .delta and reference.bin abstraction (never visible to callers)

    This class adds:
    - Batch processing capabilities
    - Streaming support
    - Metadata/tagging
    - Compression statistics
    """

    def __init__(self, settings: S3Settings) -> None:
        self._settings = settings
        self._region = settings.region_name or "us-east-1"

        # Create boto3 S3 client with explicit credentials
        # This avoids environment variable pollution and supports multi-user scenarios
        import boto3

        self._boto3_client = boto3.client(
            "s3",
            endpoint_url=settings.endpoint_url,
            aws_access_key_id=settings.access_key_id,
            aws_secret_access_key=settings.secret_access_key,
            aws_session_token=settings.session_token,
            region_name=settings.region_name,
            config=boto3.session.Config(s3={"addressing_style": settings.addressing_style}),
            verify=settings.verify,
        )

        # Create DeltaGlider storage adapter with pre-configured boto3 client
        from deltaglider.adapters import S3StorageAdapter

        storage_adapter = S3StorageAdapter(client=self._boto3_client, endpoint_url=settings.endpoint_url)

        # Create DeltaGlider client using the custom storage adapter
        from pathlib import Path

        from deltaglider.adapters import (
            FsCacheAdapter,
            NoopMetricsAdapter,
            Sha256Adapter,
            StdLoggerAdapter,
            UtcClockAdapter,
            XdeltaAdapter,
        )
        from deltaglider.client import DeltaGliderClient
        from deltaglider.core.service import DeltaService

        cache_dir = settings.cache_dir or os.path.join(tempfile.gettempdir(), "dgcommander-cache")

        hasher = Sha256Adapter()
        diff = XdeltaAdapter()
        cache = FsCacheAdapter(Path(cache_dir), hasher)
        clock = UtcClockAdapter()
        logger = StdLoggerAdapter(level="INFO")
        metrics = NoopMetricsAdapter()

        service = DeltaService(
            storage=storage_adapter,
            diff=diff,
            hasher=hasher,
            cache=cache,
            clock=clock,
            logger=logger,
            metrics=metrics,
            tool_version="dgcommander/0.1.0",
            max_ratio=0.5,
        )

        self._client = DeltaGliderClient(service, settings.endpoint_url)

    # -- public API -----------------------------------------------------

    def list_buckets(self, compute_stats: bool = False) -> Iterable[BucketSnapshot]:
        # Use boto3 client for bucket listing
        response = self._boto3_client.list_buckets()
        buckets: list[BucketSnapshot] = []
        for bucket in response.get("Buckets", []):
            name = bucket["Name"]
            if compute_stats:
                # Only compute expensive stats if explicitly requested
                listing = self.list_objects(name, prefix="")
                original_total = sum(obj.original_bytes for obj in listing.objects)
                stored_total = sum(obj.stored_bytes for obj in listing.objects)
                savings_pct = 0.0
                if original_total:
                    savings_pct = (1.0 - (stored_total / original_total)) * 100.0
                object_count = len(listing.objects)
            else:
                # Return placeholder stats for quick listing
                original_total = 0
                stored_total = 0
                savings_pct = 0.0
                object_count = 0

            buckets.append(
                BucketSnapshot(
                    name=name,
                    object_count=object_count,
                    original_bytes=original_total,
                    stored_bytes=stored_total,
                    savings_pct=savings_pct,
                    computed_at=datetime.now(UTC) if compute_stats else None,
                )
            )
        return buckets

    def create_bucket(self, name: str) -> None:
        # Use deltaglider client's create_bucket method
        region = self._region
        if not self._settings.endpoint_url and region != "us-east-1":
            self._client.create_bucket(Bucket=name, CreateBucketConfiguration={"LocationConstraint": region})
        else:
            self._client.create_bucket(Bucket=name)

    def delete_bucket(self, name: str) -> None:
        # Use deltaglider client's delete_bucket method
        self._client.delete_bucket(Bucket=name)

    def bucket_exists(self, name: str) -> bool:
        """Check if a bucket exists without listing all objects."""
        try:
            # Check if bucket is in the list of buckets
            response = self._client.list_buckets()
            bucket_names = [b["Name"] for b in response.get("Buckets", [])]
            return name in bucket_names
        except Exception:
            return False

    def list_objects(
        self, bucket: str, prefix: str, max_items: int | None = None, quick_mode: bool = False
    ) -> ObjectListing:
        """List objects with optional limit and quick mode for better performance.

        Args:
            bucket: S3 bucket name
            prefix: Object key prefix to filter by
            max_items: Maximum number of items to fetch (for pagination)
            quick_mode: If True, skip metadata extraction for faster listing (currently ignored)
        """
        normalized_prefix = self._normalize_prefix(prefix)

        # Use deltaglider client's list_objects - it handles all .delta and reference.bin abstraction
        response = self._client.list_objects(
            Bucket=bucket,
            Prefix=normalized_prefix,
            MaxKeys=max_items or 1000,
            Delimiter="/",  # Get common prefixes for folder-like navigation
            FetchMetadata=True,  # Fetch metadata for compression info
        )

        objects: list[LogicalObject] = []
        for item in response.contents:
            key = item.key
            size = item.size
            last_modified = item.last_modified

            # deltaglider 4.1.0 provides delta metadata directly as attributes
            original_size = item.original_size
            stored_size = item.compressed_size if item.is_delta else size
            compressed = item.is_delta

            # Parse last_modified from ISO string to datetime
            if isinstance(last_modified, str):
                last_modified = datetime.fromisoformat(last_modified)
            elif last_modified and last_modified.tzinfo is None:
                last_modified = last_modified.replace(tzinfo=UTC)
            elif last_modified:
                last_modified = last_modified.astimezone(UTC)
            else:
                last_modified = datetime.now(UTC)

            objects.append(
                LogicalObject(
                    key=key,
                    original_bytes=original_size,
                    stored_bytes=stored_size,
                    compressed=compressed,
                    modified=last_modified,
                    physical_key=key,  # deltaglider 4.1.0 abstracts physical keys
                )
            )

        # Extract common prefixes (folders) and filter out empty/root prefixes
        common_prefixes = [
            p["Prefix"]
            for p in response.common_prefixes
            if p["Prefix"] and p["Prefix"] != "/" and p["Prefix"] != normalized_prefix
        ]

        return ObjectListing(objects=objects, common_prefixes=sorted(common_prefixes))

    def get_metadata(self, bucket: str, key: str) -> FileMetadata:
        normalized = self._normalize_key(key)

        # Use list_objects to get metadata - it's more reliable than get_object
        # because it doesn't try to download the file
        listing = self.list_objects(bucket, prefix=normalized, max_items=1, quick_mode=False)

        # Find the exact match
        for obj in listing.objects:
            if obj.key == normalized:
                return FileMetadata(
                    key=obj.key,
                    original_bytes=obj.original_bytes,
                    stored_bytes=obj.stored_bytes,
                    compressed=obj.compressed,
                    modified=obj.modified,
                    accept_ranges=False,
                )

        # If not found in listing, raise KeyError
        raise KeyError(f"Object not found: {normalized}")

    def open_object_stream(self, bucket: str, key: str) -> io.BufferedReader:
        normalized = self._normalize_key(key)
        # Use deltaglider client's get_object - it handles decompression automatically
        response = self._client.get_object(Bucket=bucket, Key=normalized)
        body = response["Body"]

        # Read the stream into a BytesIO buffer
        buffer = io.BytesIO(body.read())
        buffer.seek(0)
        return io.BufferedReader(buffer)

    def estimated_object_size(self, bucket: str, key: str) -> int:
        metadata = self.get_metadata(bucket, key)
        return metadata.original_bytes

    def delete_object(self, bucket: str, key: str) -> None:
        normalized = self._normalize_key(key)
        # Use deltaglider client's delete_object - it handles physical file cleanup
        self._client.delete_object(Bucket=bucket, Key=normalized)

    def delete_objects(self, bucket: str, keys: list[str]) -> None:
        normalized_keys = [self._normalize_key(key) for key in keys]
        self._client.delete_objects(Bucket=bucket, Delete={"Objects": [{"Key": key} for key in normalized_keys]})

    def upload(self, bucket: str, key: str, file_obj: BinaryIO) -> UploadSummary:
        normalized = self._normalize_key(key)
        if not normalized:
            raise ValueError("Object key cannot be empty")

        if hasattr(file_obj, "seek"):
            try:
                file_obj.seek(0)
            except (OSError, AttributeError):
                pass

        # Read file content
        content = file_obj.read()
        original_size = len(content)

        # Use deltaglider client's put_object - it handles compression automatically
        self._client.put_object(Bucket=bucket, Key=normalized, Body=content)

        # Get metadata to determine compression stats
        metadata = self.get_metadata(bucket, normalized)

        upload_summary = UploadSummary(
            bucket=bucket,
            key=normalized,
            original_bytes=original_size,
            stored_bytes=metadata.stored_bytes,
            compressed=metadata.compressed,
            operation="put",  # deltaglider 4.1.0 abstracts operation details
            physical_key=normalized,  # physical key is abstracted away
        )
        return upload_summary

    def upload_batch(
        self, bucket: str, files: list[tuple[str, BinaryIO]], prefix: str | None = None, max_parallel: int = 4
    ) -> list[UploadSummary]:
        """
        Upload multiple files in parallel.
        DeltaGlider automatically handles optimal compression per file.
        """
        from concurrent.futures import ThreadPoolExecutor, as_completed

        results = []
        with ThreadPoolExecutor(max_workers=max_parallel) as executor:
            future_to_key = {}

            for key, file_obj in files:
                full_key = f"{prefix}/{key}" if prefix else key
                future = executor.submit(self.upload, bucket, full_key, file_obj)
                future_to_key[future] = key

            for future in as_completed(future_to_key):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    # Log error but continue with other files
                    key = future_to_key[future]
                    print(f"Failed to upload {key}: {e}")

        return results

    def stream_object(self, bucket: str, key: str, chunk_size: int = 8192) -> Iterator[bytes]:
        """Stream object data in chunks for efficient memory usage."""
        stream = self.open_object_stream(bucket, key)
        try:
            while True:
                chunk = stream.read(chunk_size)
                if not chunk:
                    break
                yield chunk
        finally:
            stream.close()

    def get_compression_stats(self, bucket: str) -> dict[str, any]:
        """Get compression statistics showing DeltaGlider's automatic optimization."""
        listing = self.list_objects(bucket, prefix="")

        stats = {
            "total_objects": len(listing.objects),
            "compressed_objects": sum(1 for obj in listing.objects if obj.compressed),
            "total_original_bytes": sum(obj.original_bytes for obj in listing.objects),
            "total_stored_bytes": sum(obj.stored_bytes for obj in listing.objects),
            "total_savings_bytes": 0,
            "compression_rate": 0.0,
            "top_compressions": [],
        }

        stats["total_savings_bytes"] = stats["total_original_bytes"] - stats["total_stored_bytes"]

        if stats["total_original_bytes"] > 0:
            stats["compression_rate"] = stats["total_savings_bytes"] / stats["total_original_bytes"]

        # Find top compressed files
        compressions = []
        for obj in listing.objects:
            if obj.compressed and obj.original_bytes > 0:
                savings = obj.original_bytes - obj.stored_bytes
                rate = savings / obj.original_bytes
                compressions.append(
                    {
                        "key": obj.key,
                        "original_bytes": obj.original_bytes,
                        "stored_bytes": obj.stored_bytes,
                        "savings_bytes": savings,
                        "compression_rate": rate * 100,
                    }
                )

        stats["top_compressions"] = sorted(compressions, key=lambda x: x["savings_bytes"], reverse=True)[:10]

        return stats

    # -- helpers --------------------------------------------------------

    @staticmethod
    def _normalize_key(key: str) -> str:
        return key.lstrip("/")

    @staticmethod
    def _normalize_prefix(prefix: str) -> str:
        return prefix.lstrip("/")


__all__ = ["S3DeltaGliderSDK", "S3Settings"]
