"""S3-backed DeltaGlider SDK implementation."""

from __future__ import annotations

import io
import logging
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, BinaryIO

from ..models import BucketSnapshot, FileMetadata, LogicalObject, ObjectListing, StatsMode, UploadSummary
from ._bucket_cache import BucketStatsCache
from ._compression import compute_compression_stats
from ._delta_metadata import DeltaMetadataResolver
from .base import BaseDeltaGliderAdapter


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
    connect_timeout: float = 5.0
    read_timeout: float = 10.0
    retry_attempts: int = 2


logger = logging.getLogger(__name__)


class S3DeltaGliderSDK(BaseDeltaGliderAdapter):
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
        self._region = settings.region_name or "eu-west-1"
        self._bucket_cache = BucketStatsCache()

        # Create boto3 S3 client with explicit credentials for bucket operations
        # that are not yet fully abstracted by deltaglider
        import boto3

        retry_attempts = max(1, settings.retry_attempts)
        client_config = boto3.session.Config(
            s3={"addressing_style": settings.addressing_style},
            connect_timeout=settings.connect_timeout,
            read_timeout=settings.read_timeout,
            retries={"max_attempts": retry_attempts, "mode": "standard"},
        )

        self._boto3_client = boto3.client(
            "s3",
            endpoint_url=settings.endpoint_url,
            aws_access_key_id=settings.access_key_id,
            aws_secret_access_key=settings.secret_access_key,
            aws_session_token=settings.session_token,
            region_name=settings.region_name,
            config=client_config,
            verify=settings.verify,
        )
        self._delta_resolver = DeltaMetadataResolver(self._boto3_client)

        # Create DeltaGlider client using the factory function (DeltaGlider 5.0.3+)
        # Note: DeltaGlider 5.0.3 manages cache internally with credential-aware keys
        from deltaglider.client import create_client

        self._client = create_client(
            endpoint_url=settings.endpoint_url,
            aws_access_key_id=settings.access_key_id,
            aws_secret_access_key=settings.secret_access_key,
            aws_session_token=settings.session_token,
            region_name=settings.region_name,
            log_level="INFO",
        )

    # -- public API -----------------------------------------------------

    def list_buckets(self, compute_stats: bool = False) -> Iterable[BucketSnapshot]:
        """List buckets using cached statistics when available."""

        response = self._boto3_client.list_buckets()
        bucket_names = [bucket["Name"] for bucket in response.get("Buckets", [])]

        # Drop cache entries for buckets that are gone
        self._bucket_cache.drop_missing(bucket_names)

        snapshots: list[BucketSnapshot] = []
        for name in bucket_names:
            if compute_stats:
                snapshot = self._refresh_bucket_stats(name, StatsMode.detailed)
            else:
                snapshot = self._bucket_cache.get(name)
                if snapshot is None:
                    snapshot = self._placeholder_snapshot(name)
            snapshots.append(snapshot)

        return snapshots

    def create_bucket(self, name: str) -> None:
        region = self._region

        # us-east-1 is the only AWS region that REQUIRES LocationConstraint to be null or empty
        # All other regions require it (including eu-west-1)
        # For custom endpoints (MinIO, etc.), LocationConstraint is optional but harmless
        if region and region != "us-east-1":
            self._client.create_bucket(Bucket=name, CreateBucketConfiguration={"LocationConstraint": region})
        else:
            self._client.create_bucket(Bucket=name)
        self._update_cache(self._placeholder_snapshot(name))

    def delete_bucket(self, name: str) -> None:
        # Use deltaglider client's delete_bucket method
        self._client.delete_bucket(Bucket=name)
        self._bucket_cache.remove(name)

    def compute_bucket_stats(self, name: str, mode: StatsMode = StatsMode.detailed) -> BucketSnapshot:
        response = self._boto3_client.list_buckets()
        bucket_names = [bucket["Name"] for bucket in response.get("Buckets", [])]
        if name not in bucket_names:
            raise ValueError(f"Bucket {name} not found")
        return self._refresh_bucket_stats(name, mode)

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
            max_items: Maximum number of items to fetch. If None, fetch all objects.
            quick_mode: If True, skip metadata extraction for faster listing (FetchMetadata=False)
        """
        normalized_prefix = self._normalize_prefix(prefix)

        objects: list[LogicalObject] = []
        common_prefixes_set: set[str] = set()
        continuation_token = None

        # When max_items is None, fetch ALL objects by handling pagination
        if max_items is None:
            while True:
                list_kwargs = {
                    "Bucket": bucket,
                    "Prefix": normalized_prefix,
                    "MaxKeys": 1000,  # S3 max per request
                    "Delimiter": "/",
                    "FetchMetadata": not quick_mode,  # Skip metadata when quick_mode=True
                }
                if continuation_token:
                    list_kwargs["ContinuationToken"] = continuation_token

                response = self._client.list_objects(**list_kwargs)

                self._extend_listing_response(
                    bucket,
                    response,
                    objects,
                    common_prefixes_set,
                    normalized_prefix,
                    quick_mode,
                )

                # Check if there are more results
                if not response.get("IsTruncated", False):
                    break
                continuation_token = response.get("NextContinuationToken")
        else:
            # Limited fetch for pagination
            response = self._client.list_objects(
                Bucket=bucket,
                Prefix=normalized_prefix,
                MaxKeys=max_items,
                Delimiter="/",
                FetchMetadata=not quick_mode,  # Skip metadata when quick_mode=True
            )

            self._extend_listing_response(
                bucket,
                response,
                objects,
                common_prefixes_set,
                normalized_prefix,
                quick_mode,
            )

        return ObjectListing(objects=objects, common_prefixes=sorted(common_prefixes_set))

    def get_metadata(self, bucket: str, key: str) -> FileMetadata:
        normalized = self._normalize_key(key)

        # Strategy: Use list_objects with quick_mode=False to get deltaglider compression metadata,
        # then head_object to get S3-specific metadata (ContentType, custom Metadata)
        # Note: For delta files, this makes 2 HEAD requests (deltaglider's + ours)
        # but it's necessary because deltaglider doesn't expose ContentType/Metadata
        listing = self.list_objects(bucket, prefix=normalized, max_items=1, quick_mode=False)

        # Find the exact match
        for obj in listing.objects:
            if obj.key == normalized:
                # Fetch S3-specific metadata using head_object
                # Note: ContentType and custom Metadata are NOT included in list_objects_v2 responses
                # See: https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
                try:
                    # Try to get metadata using deltaglider client's head_object
                    # Note: deltaglider's head_object has a bug where it doesn't handle logical names properly
                    # So we need to try both the logical name and the physical name with .delta suffix
                    response = None
                    metadata_error = None

                    try:
                        # First try the logical name
                        response = self._client.head_object(Bucket=bucket, Key=normalized)
                    except Exception as e:
                        metadata_error = e
                        # If compressed, try with .delta suffix (physical name)
                        if obj.compressed:
                            try:
                                response = self._client.head_object(Bucket=bucket, Key=f"{normalized}.delta")
                            except Exception:
                                # If both fail, re-raise the original error
                                raise metadata_error

                    if not response:
                        raise metadata_error or Exception("Failed to get object metadata")

                    # Extract S3 metadata (only available via head_object)
                    s3_metadata = response.get("Metadata", {})
                    content_type = response.get("ContentType")
                    etag = response.get("ETag", "").strip('"')  # Remove quotes from ETag
                    accept_ranges = response.get("AcceptRanges") == "bytes"

                    # Log metadata for debugging
                    if s3_metadata:
                        logger.debug(f"Found S3 metadata for {normalized}: {s3_metadata}")

                    # Use compression data from deltaglider (via quick_mode=False)
                    return FileMetadata(
                        key=obj.key,
                        original_bytes=obj.original_bytes,
                        stored_bytes=obj.stored_bytes,
                        compressed=obj.compressed,
                        modified=obj.modified,
                        accept_ranges=accept_ranges,
                        content_type=content_type,
                        etag=etag,
                        metadata=s3_metadata,
                    )
                except Exception as e:
                    # Fallback to basic metadata if head_object fails
                    logger.warning(f"Failed to get full metadata for {normalized}: {e}")
                    return FileMetadata(
                        key=obj.key,
                        original_bytes=obj.original_bytes,
                        stored_bytes=obj.stored_bytes,
                        compressed=obj.compressed,
                        modified=obj.modified,
                        accept_ranges=False,
                        metadata={},  # Initialize empty dict instead of None
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
        # Note: Removed _refresh_bucket_stats() call here as it hangs indefinitely
        # Stats will be refreshed on-demand when viewing buckets
        self.invalidate_bucket_cache(bucket)

    def delete_objects(self, bucket: str, keys: list[str]) -> None:
        normalized_keys = [self._normalize_key(key) for key in keys]
        self._client.delete_objects(Bucket=bucket, Delete={"Objects": [{"Key": key} for key in normalized_keys]})
        # Note: Removed _refresh_bucket_stats() call here as it hangs indefinitely
        # Stats will be refreshed on-demand when viewing buckets
        self.invalidate_bucket_cache(bucket)

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
        # Note: Removed _refresh_bucket_stats() call here as it hangs indefinitely
        # Stats will be refreshed on-demand when viewing buckets
        self.invalidate_bucket_cache(bucket)
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
                logger.error("Failed to upload %s: %s", key, e)

        # Note: Removed _refresh_bucket_stats() call here as it hangs indefinitely
        # Stats will be refreshed on-demand when viewing buckets
        if results:
            self.invalidate_bucket_cache(bucket)

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

        return compute_compression_stats(listing)

    # -- cache helpers -------------------------------------------------

    def update_cached_bucket_stats(self, snapshot: BucketSnapshot) -> None:
        """Allow services to push a freshly computed snapshot into the cache."""

        self._update_cache(snapshot)

    def invalidate_bucket_cache(self, bucket: str) -> None:
        self._bucket_cache.remove(bucket)

    def clear_bucket_cache(self) -> None:
        self._bucket_cache.clear()

    def _update_cache(self, snapshot: BucketSnapshot) -> None:
        self._bucket_cache.put(snapshot)

    def _get_cached_snapshot(self, name: str) -> BucketSnapshot | None:
        return self._bucket_cache.get(name)

    def _refresh_bucket_stats(self, name: str, mode: StatsMode = StatsMode.detailed) -> BucketSnapshot:
        try:
            # Use supplied mode and bypass caches to guarantee fresh statistics
            stats = self._client.get_bucket_stats(name, mode=mode.value, use_cache=False, refresh_cache=True)
        except Exception as exc:  # pragma: no cover - defensive logging path
            # Log at ERROR level so we can see what's actually failing
            logging.getLogger(__name__).error("Failed to refresh stats for %s: %s", name, exc, exc_info=True)
            snapshot = self._placeholder_snapshot(name)
            self.invalidate_bucket_cache(name)
            return snapshot

        original_total = stats.total_size
        stored_total = stats.compressed_size
        savings_pct = 0.0
        if original_total:
            ratio = 1.0 - (stored_total / original_total)
            savings_pct = max(0.0, min(100.0, ratio * 100.0))

        snapshot = BucketSnapshot(
            name=name,
            object_count=stats.object_count,
            original_bytes=original_total,
            stored_bytes=stored_total,
            savings_pct=savings_pct,
            computed_at=datetime.now(UTC),
            object_count_is_limited=getattr(stats, "object_limit_reached", False),
        )
        self._update_cache(snapshot)
        return snapshot

    def _placeholder_snapshot(self, name: str) -> BucketSnapshot:
        return BucketSnapshot(
            name=name,
            object_count=0,
            original_bytes=0,
            stored_bytes=0,
            savings_pct=0.0,
            computed_at=None,
            object_count_is_limited=False,
        )

    # -- helpers --------------------------------------------------------

    def _extend_listing_response(
        self,
        bucket: str,
        response: dict,
        objects: list[LogicalObject],
        common_prefixes: set[str],
        normalized_prefix: str,
        quick_mode: bool,
    ) -> None:
        for item in response.get("Contents", []):
            objects.append(self._logical_object_from_listing(bucket, item, quick_mode))

        for p in response.get("CommonPrefixes", []):
            prefix_val = p["Prefix"]
            if prefix_val and prefix_val != "/" and prefix_val != normalized_prefix:
                common_prefixes.add(prefix_val)

    def _logical_object_from_listing(self, bucket: str, item: Any, quick_mode: bool) -> LogicalObject:
        """
        Convert a deltaglider list_objects entry into our LogicalObject.

        The deltaglider client hides .delta suffixes from the public API but exposes compression
        metadata via custom headers. When FetchMetadata=True the client should populate the
        ``deltaglider-original-size`` attribute, however versions <=6.0.0 fail to do so because they
        look for legacy ``file_size`` metadata. Here we patch things up by issuing a targeted
        HEAD request to recover accurate sizes when needed.
        """

        if isinstance(item, dict):
            display_key = item["Key"]
            stored_size = int(item.get("Size", 0))
            metadata = item.get("Metadata", {}) or {}
            is_delta = metadata.get("deltaglider-is-delta", "false").lower() == "true"
            original_size = self._safe_int(metadata.get("deltaglider-original-size")) or stored_size
            modified = self._ensure_datetime(item.get("LastModified"))
            physical_key_hint = display_key
            if is_delta and not display_key.endswith(".delta"):
                physical_key_hint = f"{display_key}.delta"
        else:
            original_key = item.key
            is_delta = item.is_delta
            stored_candidate = getattr(item, "compressed_size", None)
            stored_size = int(stored_candidate if stored_candidate is not None else item.size)
            original_size = item.original_size if item.original_size is not None else stored_size
            modified = self._ensure_datetime(item.last_modified)
            if is_delta and original_key.endswith(".delta"):
                display_key = original_key[:-6]
            else:
                display_key = original_key
            physical_key_hint = original_key

        physical_key = self._normalize_key(physical_key_hint)

        if is_delta:
            if not quick_mode and original_size <= stored_size:
                resolved = self._delta_resolver.resolve(bucket, display_key)
                if resolved.physical_key:
                    physical_key = self._normalize_key(resolved.physical_key)
                if resolved.original_bytes is not None:
                    original_size = resolved.original_bytes
                if resolved.stored_bytes is not None:
                    stored_size = resolved.stored_bytes
        else:
            physical_key = self._normalize_key(display_key)

        return LogicalObject(
            key=display_key,
            original_bytes=int(original_size),
            stored_bytes=int(stored_size),
            compressed=is_delta,
            modified=modified,
            physical_key=physical_key,
        )

    @staticmethod
    def _safe_int(value: Any) -> int | None:
        try:
            if value is None:
                return None
            return int(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _ensure_datetime(value: datetime | str | None) -> datetime:
        if isinstance(value, datetime):
            if value.tzinfo is None:
                return value.replace(tzinfo=UTC)
            return value.astimezone(UTC)
        if isinstance(value, str):
            parsed = datetime.fromisoformat(value)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=UTC)
            return parsed.astimezone(UTC)
        return datetime.now(UTC)


__all__ = ["S3DeltaGliderSDK", "S3Settings"]
