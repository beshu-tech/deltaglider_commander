"""In-memory test double for DeltaGlider SDK."""

from __future__ import annotations

import io
from collections.abc import Iterable
from datetime import UTC, datetime
from typing import BinaryIO

from ...util.types import FileMetadata, UploadSummary
from ..models import BucketSnapshot, LogicalObject, ObjectListing


class InMemoryDeltaGliderSDK:
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
        snapshot = BucketSnapshot(
            name=name,
            object_count=0,
            original_bytes=0,
            stored_bytes=0,
            savings_pct=0.0,
            computed_at=datetime.now(UTC),
        )
        self._buckets.append(snapshot)
        self._objects.setdefault(name, [])

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
        normalized = key.lstrip("/")
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
                for i, snapshot in enumerate(self._buckets):
                    if snapshot.name == bucket:
                        updated = BucketSnapshot(
                            name=snapshot.name,
                            object_count=max(snapshot.object_count - 1, 0),
                            original_bytes=max(snapshot.original_bytes - obj.original_bytes, 0),
                            stored_bytes=max(snapshot.stored_bytes - obj.stored_bytes, 0),
                            savings_pct=snapshot.savings_pct,
                            computed_at=datetime.now(UTC),
                        )
                        self._buckets[i] = updated
                        break
                return
        raise KeyError(normalized)

    def delete_objects(self, bucket: str, keys: list[str]) -> None:
        """Delete multiple objects."""
        objects = self._objects.get(bucket)
        if objects is None:
            return  # No objects to delete

        # Track deleted bytes for bucket stats update
        deleted_original_bytes = 0
        deleted_stored_bytes = 0
        deleted_count = 0

        # Normalize all keys
        normalized_keys = {key.lstrip("/") for key in keys}

        # Delete objects and collect stats
        remaining_objects = []
        for obj in objects:
            if obj.key in normalized_keys:
                # Remove blob data
                self._blobs.pop((bucket, obj.physical_key), None)
                # Also check for the normalized key as physical key
                self._blobs.pop((bucket, obj.key), None)

                # Track stats
                deleted_original_bytes += obj.original_bytes
                deleted_stored_bytes += obj.stored_bytes
                deleted_count += 1
            else:
                remaining_objects.append(obj)

        # Update objects list
        self._objects[bucket] = remaining_objects

        # Update bucket stats if any objects were deleted
        if deleted_count > 0:
            for i, snapshot in enumerate(self._buckets):
                if snapshot.name == bucket:
                    # Recalculate savings percentage
                    new_object_count = max(snapshot.object_count - deleted_count, 0)
                    new_original_bytes = max(snapshot.original_bytes - deleted_original_bytes, 0)
                    new_stored_bytes = max(snapshot.stored_bytes - deleted_stored_bytes, 0)

                    savings_pct = 0.0
                    if new_original_bytes > 0:
                        savings_pct = (1.0 - (new_stored_bytes / new_original_bytes)) * 100.0

                    updated = BucketSnapshot(
                        name=snapshot.name,
                        object_count=new_object_count,
                        original_bytes=new_original_bytes,
                        stored_bytes=new_stored_bytes,
                        savings_pct=savings_pct,
                        computed_at=datetime.now(UTC),
                    )
                    self._buckets[i] = updated
                    break

    def upload(self, bucket: str, key: str, file_obj: BinaryIO) -> UploadSummary:
        normalized = key.lstrip("/")
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

        total_original = sum(obj.original_bytes for obj in bucket_objects)
        total_stored = sum(obj.stored_bytes for obj in bucket_objects)
        savings_pct = 0.0
        if total_original:
            savings_pct = (1.0 - (total_stored / total_original)) * 100.0

        updated_snapshot = BucketSnapshot(
            name=bucket,
            object_count=len(bucket_objects),
            original_bytes=total_original,
            stored_bytes=total_stored,
            savings_pct=savings_pct,
            computed_at=now,
        )

        for idx, snapshot in enumerate(self._buckets):
            if snapshot.name == bucket:
                self._buckets[idx] = updated_snapshot
                break
        else:
            self._buckets.append(updated_snapshot)

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

        total_original = sum(obj.original_bytes for obj in objects)
        total_stored = sum(obj.stored_bytes for obj in objects)
        savings_pct = 0.0
        if total_original:
            savings_pct = (1.0 - (total_stored / total_original)) * 100.0

        snapshot = BucketSnapshot(
            name=bucket,
            object_count=len(objects),
            original_bytes=total_original,
            stored_bytes=total_stored,
            savings_pct=savings_pct,
            computed_at=datetime.now(UTC),
        )
        self.update_cached_bucket_stats(snapshot)
        return snapshot

    def list_objects(
        self, bucket: str, prefix: str, max_items: int | None = None, quick_mode: bool = False
    ) -> ObjectListing:
        all_objs = self._objects.get(bucket, [])
        entries = []
        for obj in all_objs:
            if obj.key.startswith(prefix):
                entries.append(obj)
                # Stop early if we have enough items
                if max_items and len(entries) >= max_items:
                    break
        normalized_prefix = prefix
        if normalized_prefix and not normalized_prefix.endswith("/"):
            normalized_prefix = f"{normalized_prefix}/"
        prefixes: set[str] = set()
        for obj in entries:
            remainder = obj.key[len(prefix) :] if prefix else obj.key
            if "/" in remainder:
                first_segment = remainder.split("/", 1)[0]
                prefixes.add((normalized_prefix if normalized_prefix else "") + first_segment + "/")
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


__all__ = ["InMemoryDeltaGliderSDK"]
