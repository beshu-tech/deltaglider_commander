"""In-memory test double for DeltaGlider SDK."""

from __future__ import annotations

import io
from collections.abc import Iterable
from datetime import UTC, datetime
from typing import BinaryIO

from ...util.types import FileMetadata, UploadSummary
from ..models import BucketSnapshot, LogicalObject, ObjectListing
from .base import BaseDeltaGliderAdapter


class InMemoryDeltaGliderSDK(BaseDeltaGliderAdapter):
    """Testing double that keeps data in memory."""

    def __init__(
        self,
        *,
        buckets: Iterable[BucketSnapshot],
        objects: dict[str, list[LogicalObject]],
        blobs: dict[tuple[str, str], bytes],
    ) -> None:
        self._buckets = list(buckets)
        self._objects = objects
        self._blobs = blobs

    def list_buckets(self, compute_stats: bool = False) -> Iterable[BucketSnapshot]:
        return list(self._buckets)

    def create_bucket(self, name: str) -> None:
        if any(bucket.name == name for bucket in self._buckets):
            raise ValueError("Bucket already exists")
        self._objects.setdefault(name, [])
        self._update_bucket_snapshot(name)

    def delete_bucket(self, name: str) -> None:
        if not any(bucket.name == name for bucket in self._buckets):
            raise KeyError(name)
        self._buckets = [bucket for bucket in self._buckets if bucket.name != name]
        self._objects.pop(name, None)
        for key in list(self._blobs.keys()):
            if key[0] == name:
                self._blobs.pop(key)

    def bucket_exists(self, name: str) -> bool:
        """Check if a bucket exists."""
        return any(bucket.name == name for bucket in self._buckets)

    def delete_object(self, bucket: str, key: str) -> None:
        normalized = self._normalize_key(key)
        objects = self._objects.get(bucket)
        if objects is None:
            raise KeyError(normalized)
        for idx, obj in enumerate(list(objects)):
            if obj.key == normalized:
                objects.pop(idx)
                self._blobs.pop((bucket, obj.physical_key), None)
                for blob_key in list(self._blobs.keys()):
                    if blob_key[0] == bucket and blob_key[1] == normalized:
                        self._blobs.pop(blob_key, None)
                self._update_bucket_snapshot(bucket)
                return
        raise KeyError(normalized)

    def delete_objects(self, bucket: str, keys: list[str]) -> None:
        """Delete multiple objects."""
        objects = self._objects.get(bucket)
        if objects is None:
            return  # No objects to delete

        # Track deleted bytes for bucket stats update
        deleted_count = 0

        # Normalize all keys
        normalized_keys = {self._normalize_key(key) for key in keys}

        # Delete objects and collect stats
        remaining_objects = []
        for obj in objects:
            if obj.key in normalized_keys:
                # Remove blob data
                self._blobs.pop((bucket, obj.physical_key), None)
                # Also check for the normalized key as physical key
                self._blobs.pop((bucket, obj.key), None)

                # Track stats
                deleted_count += 1
            else:
                remaining_objects.append(obj)

        # Update objects list
        self._objects[bucket] = remaining_objects

        # Update bucket stats if any objects were deleted
        if deleted_count > 0:
            self._update_bucket_snapshot(bucket)

    def upload(self, bucket: str, key: str, file_obj: BinaryIO) -> UploadSummary:
        normalized = self._normalize_key(key)
        data = file_obj.read()
        original_bytes = len(data)
        stored_bytes = original_bytes
        now = datetime.now(UTC)
        physical_key = normalized

        bucket_objects = self._objects.setdefault(bucket, [])
        for index, existing in enumerate(bucket_objects):
            if existing.key == normalized:
                bucket_objects[index] = LogicalObject(
                    key=normalized,
                    original_bytes=original_bytes,
                    stored_bytes=stored_bytes,
                    compressed=False,
                    modified=now,
                    physical_key=physical_key,
                )
                break
        else:
            bucket_objects.append(
                LogicalObject(
                    key=normalized,
                    original_bytes=original_bytes,
                    stored_bytes=stored_bytes,
                    compressed=False,
                    modified=now,
                    physical_key=physical_key,
                )
            )

        self._blobs[(bucket, physical_key)] = data

        self._update_bucket_snapshot(bucket)

        summary = UploadSummary(
            bucket=bucket,
            key=normalized,
            original_bytes=original_bytes,
            stored_bytes=stored_bytes,
            compressed=False,
            operation="upload_direct",
            physical_key=physical_key,
        )
        return summary

    def update_cached_bucket_stats(self, snapshot: BucketSnapshot) -> None:
        """Keep parity with S3 adapter cache helper."""
        for idx, bucket in enumerate(self._buckets):
            if bucket.name == snapshot.name:
                self._buckets[idx] = snapshot
                break
        else:
            self._buckets.append(snapshot)

    def compute_bucket_stats(self, bucket: str) -> BucketSnapshot:
        objects = self._objects.get(bucket)
        if objects is None:
            raise ValueError(f"Bucket {bucket} not found")

        snapshot = self._build_snapshot(bucket, objects, computed_at=datetime.now(UTC))
        self.update_cached_bucket_stats(snapshot)
        return snapshot

    def list_objects(
        self, bucket: str, prefix: str, max_items: int | None = None, quick_mode: bool = False
    ) -> ObjectListing:
        normalized_prefix = self._normalize_prefix(prefix)
        all_objs = self._objects.get(bucket, [])
        entries = []
        for obj in all_objs:
            if obj.key.startswith(normalized_prefix):
                entries.append(obj)
                # Stop early if we have enough items
                if max_items and len(entries) >= max_items:
                    break
        display_prefix = normalized_prefix
        if display_prefix and not display_prefix.endswith("/"):
            display_prefix = f"{display_prefix}/"
        prefixes: set[str] = set()
        for obj in entries:
            remainder = obj.key[len(normalized_prefix) :] if normalized_prefix else obj.key
            if "/" in remainder:
                first_segment = remainder.split("/", 1)[0]
                prefixes.add((display_prefix if display_prefix else "") + first_segment + "/")
        return ObjectListing(objects=entries, common_prefixes=sorted(prefixes))

    def get_metadata(self, bucket: str, key: str) -> FileMetadata:
        for obj in self._objects.get(bucket, []):
            if obj.key == key:
                return FileMetadata(
                    key=obj.key,
                    original_bytes=obj.original_bytes,
                    stored_bytes=obj.stored_bytes,
                    compressed=obj.compressed,
                    modified=obj.modified,
                    accept_ranges=False,
                )
        raise KeyError(key)

    def open_object_stream(self, bucket: str, key: str) -> io.BufferedReader:
        try:
            data = self._blobs[(bucket, key)]
        except KeyError as exc:
            raise FileNotFoundError(key) from exc
        return io.BufferedReader(io.BytesIO(data))

    def estimated_object_size(self, bucket: str, key: str) -> int:
        try:
            return len(self._blobs[(bucket, key)])
        except KeyError as exc:
            raise FileNotFoundError(key) from exc

    def _update_bucket_snapshot(self, bucket: str) -> None:
        objects = self._objects.get(bucket, [])
        snapshot = self._build_snapshot(bucket, objects, computed_at=datetime.now(UTC))
        for idx, existing in enumerate(self._buckets):
            if existing.name == bucket:
                self._buckets[idx] = snapshot
                break
        else:
            self._buckets.append(snapshot)


__all__ = ["InMemoryDeltaGliderSDK"]
