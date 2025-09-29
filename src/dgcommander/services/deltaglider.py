"""Abstractions for the DeltaGlider SDK integration layer."""
from __future__ import annotations

import io
import tempfile
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import BinaryIO, Dict, Iterable, Iterator, List, Optional, Protocol, Tuple

import boto3
from boto3.session import Session
from botocore.config import Config as BotoConfig

from deltaglider.adapters import (
    FsCacheAdapter,
    NoopMetricsAdapter,
    S3StorageAdapter,
    Sha256Adapter,
    StdLoggerAdapter,
    UtcClockAdapter,
    XdeltaAdapter,
)
from deltaglider.core import DeltaService, ObjectKey
from deltaglider.core.models import DeltaSpace
from deltaglider.ports.storage import ObjectHead, StoragePort

from ..util.types import FileMetadata, UploadSummary


@dataclass(slots=True)
class LogicalObject:
    """Logical representation of a DeltaGlider object."""

    key: str
    original_bytes: int
    stored_bytes: int
    compressed: bool
    modified: datetime
    physical_key: str


@dataclass(slots=True)
class BucketSnapshot:
    name: str
    object_count: int
    original_bytes: int
    stored_bytes: int
    savings_pct: float
    computed_at: datetime


@dataclass(slots=True)
class ObjectListing:
    objects: List[LogicalObject]
    common_prefixes: List[str]


class DeltaGliderSDK(Protocol):
    """Interface the DeltaGlider integrations must implement."""

    def list_buckets(self) -> Iterable[BucketSnapshot]:
        ...

    def create_bucket(self, name: str) -> None:
        ...

    def delete_bucket(self, name: str) -> None:
        ...

    def list_objects(self, bucket: str, prefix: str) -> ObjectListing:
        ...

    def get_metadata(self, bucket: str, key: str) -> FileMetadata:
        ...

    def open_object_stream(self, bucket: str, key: str) -> io.BufferedReader:
        ...

    def estimated_object_size(self, bucket: str, key: str) -> int:
        ...

    def delete_object(self, bucket: str, key: str) -> None:
        ...

    def upload(self, bucket: str, key: str, file_obj: BinaryIO) -> UploadSummary:
        ...


# -----------------------
# In-memory testing double
# -----------------------


class InMemoryDeltaGliderSDK:
    """Testing double that keeps data in memory."""

    def __init__(
        self,
        *,
        buckets: Iterable[BucketSnapshot],
        objects: dict[str, List[LogicalObject]],
        blobs: dict[Tuple[str, str], bytes],
    ) -> None:
        self._buckets = list(buckets)
        self._objects = objects
        self._blobs = blobs

    def list_buckets(self) -> Iterable[BucketSnapshot]:
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
            computed_at=datetime.now(timezone.utc),
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
                            computed_at=datetime.now(timezone.utc),
                        )
                        self._buckets[i] = updated
                        break
                return
        raise KeyError(normalized)

    def upload(self, bucket: str, key: str, file_obj: BinaryIO) -> UploadSummary:
        normalized = key.lstrip("/")
        data = file_obj.read()
        original_bytes = len(data)
        stored_bytes = original_bytes
        now = datetime.now(timezone.utc)
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

    def list_objects(self, bucket: str, prefix: str) -> ObjectListing:
        entries = [obj for obj in self._objects.get(bucket, []) if obj.key.startswith(prefix)]
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


# -----------------------
# Real S3-backed SDK
# -----------------------


@dataclass(slots=True)
class S3Settings:
    """Configuration values for the S3-backed SDK."""

    endpoint_url: Optional[str] = None
    region_name: Optional[str] = None
    access_key_id: Optional[str] = None
    secret_access_key: Optional[str] = None
    session_token: Optional[str] = None
    addressing_style: str = "path"
    verify: bool = True
    cache_dir: Optional[str] = None


class S3DeltaGliderSDK:
    """Real SDK backed by the official deltaglider package and boto3."""

    def __init__(self, settings: S3Settings) -> None:
        self._settings = settings
        self._session: Session = boto3.session.Session(
            aws_access_key_id=settings.access_key_id,
            aws_secret_access_key=settings.secret_access_key,
            aws_session_token=settings.session_token,
            region_name=settings.region_name or "us-east-1",
        )
        client_kwargs: Dict[str, object] = {}
        if settings.endpoint_url:
            client_kwargs["endpoint_url"] = settings.endpoint_url
            if settings.endpoint_url.startswith("http://"):
                client_kwargs["use_ssl"] = False
        client_kwargs["verify"] = settings.verify
        client_kwargs["config"] = BotoConfig(
            s3={"addressing_style": settings.addressing_style or "path"}
        )
        self._client = self._session.client("s3", **client_kwargs)
        self._storage: StoragePort = S3StorageAdapter(client=self._client)

        hasher = Sha256Adapter()
        cache_dir = Path(settings.cache_dir or "/tmp/dgcommander-cache")
        cache_dir.mkdir(parents=True, exist_ok=True)
        cache = FsCacheAdapter(cache_dir, hasher)

        self._service = DeltaService(
            storage=self._storage,
            diff=XdeltaAdapter(),
            hasher=hasher,
            cache=cache,
            clock=UtcClockAdapter(),
            logger=StdLoggerAdapter(level="INFO"),
            metrics=NoopMetricsAdapter(),
            tool_version="dgcommander/0.1.0",
        )

        self._logical_index: Dict[Tuple[str, str], str] = {}
        self._index_lock = threading.RLock()

    # -- public API -----------------------------------------------------

    def list_buckets(self) -> Iterable[BucketSnapshot]:
        response = self._client.list_buckets()
        buckets: List[BucketSnapshot] = []
        for bucket in response.get("Buckets", []):
            name = bucket["Name"]
            listing = self.list_objects(name, prefix="")
            original_total = sum(obj.original_bytes for obj in listing.objects)
            stored_total = sum(obj.stored_bytes for obj in listing.objects)
            savings_pct = 0.0
            if original_total:
                savings_pct = (1.0 - (stored_total / original_total)) * 100.0
            buckets.append(
                BucketSnapshot(
                    name=name,
                    object_count=len(listing.objects),
                    original_bytes=original_total,
                    stored_bytes=stored_total,
                    savings_pct=savings_pct,
                    computed_at=datetime.now(timezone.utc),
                )
            )
        return buckets

    def create_bucket(self, name: str) -> None:
        params: Dict[str, object] = {"Bucket": name}
        region = self._session.region_name or "us-east-1"
        if not self._settings.endpoint_url and region != "us-east-1":
            params["CreateBucketConfiguration"] = {"LocationConstraint": region}
        self._client.create_bucket(**params)

    def delete_bucket(self, name: str) -> None:
        self._client.delete_bucket(Bucket=name)
        with self._index_lock:
            for key in list(self._logical_index.keys()):
                if key[0] == name:
                    self._logical_index.pop(key, None)

    def list_objects(self, bucket: str, prefix: str) -> ObjectListing:
        normalized_prefix = self._normalize_prefix(prefix)
        heads = self._iter_heads(bucket, normalized_prefix)
        objects_map: Dict[str, LogicalObject] = {}
        prefixes: set[str] = set()

        for head in heads:
            logical = self._logical_from_head(bucket, head)
            if logical is None:
                continue
            if normalized_prefix and not logical.key.startswith(normalized_prefix):
                continue
            existing = objects_map.get(logical.key)
            if existing is None or logical.modified > existing.modified:
                objects_map[logical.key] = logical

        objects = list(objects_map.values())

        if normalized_prefix:
            child_prefix_root = normalized_prefix if normalized_prefix.endswith("/") else f"{normalized_prefix}/"
        else:
            child_prefix_root = ""

        for obj in objects:
            if child_prefix_root and not obj.key.startswith(child_prefix_root):
                continue
            remainder = obj.key[len(child_prefix_root) :] if child_prefix_root else obj.key
            if "/" in remainder:
                segment = remainder.split("/", 1)[0]
                prefixes.add(f"{child_prefix_root}{segment}/")

        with self._index_lock:
            for obj in objects:
                self._logical_index[(bucket, obj.key)] = obj.physical_key

        return ObjectListing(objects=objects, common_prefixes=sorted(prefixes))

    def get_metadata(self, bucket: str, key: str) -> FileMetadata:
        head, logical = self._resolve_head(bucket, key)
        return FileMetadata(
            key=logical.key,
            original_bytes=logical.original_bytes,
            stored_bytes=logical.stored_bytes,
            compressed=logical.compressed,
            modified=logical.modified,
            accept_ranges=False,
        )

    def open_object_stream(self, bucket: str, key: str) -> io.BufferedReader:
        _, logical = self._resolve_head(bucket, key)
        object_key = ObjectKey(bucket=bucket, key=logical.physical_key)
        buffer = io.BytesIO()
        self._service.get(object_key, buffer)
        buffer.seek(0)
        return io.BufferedReader(buffer)

    def estimated_object_size(self, bucket: str, key: str) -> int:
        head, logical = self._resolve_head(bucket, key)
        metadata = head.metadata or {}
        size = metadata.get("file_size")
        if size is not None:
            try:
                return int(size)
            except ValueError:
                pass
        return logical.original_bytes

    def delete_object(self, bucket: str, key: str) -> None:
        normalized = self._normalize_key(key)
        try:
            _, logical = self._resolve_head(bucket, normalized)
        except KeyError as exc:
            raise KeyError(normalized) from exc

        physical_key = logical.physical_key
        candidates = {physical_key}
        if physical_key.endswith(".delta"):
            base = physical_key[: -len(".delta")]
            if base:
                candidates.add(base)
        else:
            candidates.add(f"{physical_key}.delta")

        for candidate in list(candidates):
            try:
                self._client.delete_object(Bucket=bucket, Key=candidate)
            except self._client.exceptions.NoSuchKey:
                continue
            except Exception:
                # ignore best-effort deletions for derivative objects
                continue

        with self._index_lock:
            self._logical_index.pop((bucket, normalized), None)

    def upload(self, bucket: str, key: str, file_obj: BinaryIO) -> UploadSummary:
        normalized = self._normalize_key(key)
        if not normalized:
            raise ValueError("Object key cannot be empty")

        if "/" in normalized:
            prefix, filename = normalized.rsplit("/", 1)
        else:
            prefix, filename = "", normalized

        if not filename:
            raise ValueError("Filename cannot be empty")

        if hasattr(file_obj, "seek"):
            try:
                file_obj.seek(0)
            except (OSError, AttributeError):
                pass

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir) / filename
            with open(tmp_path, "wb") as buffer:
                while True:
                    chunk = file_obj.read(1024 * 1024)
                    if not chunk:
                        break
                    buffer.write(chunk)
                buffer.flush()

            delta_space = DeltaSpace(bucket=bucket, prefix=prefix)
            summary = self._service.put(tmp_path, delta_space)

        logical_key = f"{prefix}/{filename}" if prefix else filename
        metadata = self.get_metadata(bucket, logical_key)

        upload_summary = UploadSummary(
            bucket=bucket,
            key=metadata.key,
            original_bytes=metadata.original_bytes,
            stored_bytes=metadata.stored_bytes,
            compressed=metadata.compressed,
            operation=summary.operation,
            physical_key=summary.key,
        )
        return upload_summary

    # -- helpers --------------------------------------------------------

    def _iter_heads(self, bucket: str, prefix: str) -> Iterator[ObjectHead]:
        if prefix:
            list_prefix = f"{bucket}/{prefix}"
        else:
            list_prefix = bucket
        return self._storage.list(list_prefix)

    def _logical_from_head(self, bucket: str, head: ObjectHead) -> Optional[LogicalObject]:
        key = head.key
        if key.endswith("reference.bin"):
            return None
        metadata = head.metadata or {}
        folder = key.rsplit("/", 1)[0] if "/" in key else ""
        original_name = metadata.get("original_name") or metadata.get("source_name")
        if original_name:
            logical_key = f"{folder}/{original_name}" if folder else original_name
        else:
            logical_key = key
        logical_key = logical_key.lstrip("/")
        original_bytes = self._coerce_int(metadata.get("file_size"), head.size)
        stored_bytes = self._coerce_int(metadata.get("delta_size"), head.size)
        compressed = metadata.get("compression") not in {None, "none"} or metadata.get("delta_size") is not None or key.endswith(".delta")
        modified = head.last_modified
        if modified.tzinfo is None:
            modified = modified.replace(tzinfo=timezone.utc)
        else:
            modified = modified.astimezone(timezone.utc)
        return LogicalObject(
            key=logical_key,
            original_bytes=original_bytes,
            stored_bytes=stored_bytes,
            compressed=compressed,
            modified=modified,
            physical_key=key,
        )

    def _resolve_head(self, bucket: str, logical_key: str) -> Tuple[ObjectHead, LogicalObject]:
        normalized = self._normalize_key(logical_key)
        candidates: List[str] = []
        with self._index_lock:
            cached = self._logical_index.get((bucket, normalized))
        if cached:
            candidates.append(cached)
        candidates.append(normalized)
        if not normalized.endswith(".delta"):
            candidates.append(f"{normalized}.delta")
        for candidate in dict.fromkeys(candidates):
            head = self._storage.head(f"{bucket}/{candidate}")
            if head:
                logical = self._logical_from_head(bucket, head)
                if logical is None:
                    continue
                with self._index_lock:
                    self._logical_index[(bucket, normalized)] = logical.physical_key
                return head, logical
        raise KeyError(normalized)

    @staticmethod
    def _coerce_int(value: Optional[str], fallback: int) -> int:
        if value is None:
            return fallback
        try:
            return int(value)
        except (TypeError, ValueError):
            return fallback

    @staticmethod
    def _normalize_key(key: str) -> str:
        return key.lstrip("/")

    @staticmethod
    def _normalize_prefix(prefix: str) -> str:
        return prefix.lstrip("/")


__all__ = [
    "BucketSnapshot",
    "DeltaGliderSDK",
    "InMemoryDeltaGliderSDK",
    "LogicalObject",
    "ObjectListing",
    "S3DeltaGliderSDK",
    "S3Settings",
]
