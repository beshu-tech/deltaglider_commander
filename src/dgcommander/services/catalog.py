"""Catalog service backed by the DeltaGlider SDK and in-memory caches."""

from __future__ import annotations

import logging
from collections.abc import Iterable
from dataclasses import dataclass
from typing import BinaryIO

from botocore.exceptions import ClientError

from ..util.cache import CacheRegistry
from ..util.errors import APIError, NotFoundError, SDKError
from ..util.paging import decode_cursor, encode_cursor
from ..util.types import (
    BucketStats,
    FileMetadata,
    ObjectItem,
    ObjectList,
    ObjectSortOrder,
    UploadSummary,
)
from .deltaglider import BucketSnapshot, DeltaGliderSDK, LogicalObject

logger = logging.getLogger(__name__)


def _sort_objects(objects: Iterable[LogicalObject], sort_order: ObjectSortOrder) -> list[LogicalObject]:
    reverse = sort_order in {ObjectSortOrder.modified_desc, ObjectSortOrder.name_desc, ObjectSortOrder.size_desc}
    if sort_order in {ObjectSortOrder.name_asc, ObjectSortOrder.name_desc}:
        return sorted(objects, key=lambda obj: obj.key, reverse=reverse)
    if sort_order in {ObjectSortOrder.size_asc, ObjectSortOrder.size_desc}:
        return sorted(objects, key=lambda obj: obj.original_bytes, reverse=reverse)
    return sorted(objects, key=lambda obj: obj.modified, reverse=reverse)


@dataclass(slots=True)
class CatalogService:
    sdk: DeltaGliderSDK
    caches: CacheRegistry

    def list_buckets(self, compute_stats: bool = False) -> list[BucketStats]:
        stats: list[BucketStats] = []
        try:
            # Only compute expensive stats when explicitly requested
            snapshots = list(self.sdk.list_buckets(compute_stats=compute_stats))
        except Exception as exc:
            if isinstance(exc, APIError):
                raise
            details = {"reason": _summarize_exception(exc)}
            raise SDKError("Unable to list DeltaGlider buckets", details=details) from exc

        for snapshot in snapshots:
            cached = self.caches.savings_cache.get(snapshot.name)
            if cached:
                # Use cached stats if available
                base = cached
            else:
                # Use snapshot stats (might be placeholder if compute_stats=False)
                base = BucketStats(
                    name=snapshot.name,
                    object_count=snapshot.object_count,
                    original_bytes=snapshot.original_bytes,
                    stored_bytes=snapshot.stored_bytes,
                    savings_pct=snapshot.savings_pct,
                    pending=False,
                    computed_at=snapshot.computed_at,
                )
            stats.append(
                BucketStats(
                    name=base.name,
                    object_count=base.object_count,
                    original_bytes=base.original_bytes,
                    stored_bytes=base.stored_bytes,
                    savings_pct=base.savings_pct,
                    pending=self.caches.is_pending(snapshot.name),
                    computed_at=base.computed_at or snapshot.computed_at,
                )
            )
        return stats

    def create_bucket(self, bucket: str) -> None:
        try:
            self.sdk.create_bucket(bucket)
        except APIError:
            raise
        except ValueError as exc:
            raise APIError(code="bucket_exists", message="Bucket already exists", http_status=409) from exc
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "")
            if error_code in {"BucketAlreadyExists", "BucketAlreadyOwnedByYou"}:
                raise APIError(code="bucket_exists", message="Bucket already exists", http_status=409) from exc
            details = {"reason": _summarize_exception(exc)}
            raise SDKError("Unable to create bucket", details=details) from exc
        except Exception as exc:
            details = {"reason": _summarize_exception(exc)}
            raise SDKError("Unable to create bucket", details=details) from exc
        self._purge_bucket_caches(bucket)

    def delete_bucket(self, bucket: str) -> None:
        try:
            self.sdk.delete_bucket(bucket)
        except APIError:
            raise
        except KeyError as exc:
            raise NotFoundError("bucket", "bucket_not_found") from exc
        except ValueError as exc:
            raise NotFoundError("bucket", "bucket_not_found") from exc
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "")
            if error_code in {"NoSuchBucket", "404"}:
                raise NotFoundError("bucket", "bucket_not_found") from exc
            if error_code in {"BucketNotEmpty", "409"}:
                raise APIError(
                    code="bucket_not_empty",
                    message="Bucket is not empty",
                    http_status=409,
                ) from exc
            details = {"reason": _summarize_exception(exc)}
            raise SDKError("Unable to delete bucket", details=details) from exc
        except Exception as exc:
            details = {"reason": _summarize_exception(exc)}
            raise SDKError("Unable to delete bucket", details=details) from exc
        self._purge_bucket_caches(bucket)

    def bucket_exists(self, bucket: str) -> bool:
        """Check if a bucket exists without listing all buckets."""
        return self.sdk.bucket_exists(bucket)

    def list_objects(
        self,
        bucket: str,
        prefix: str,
        *,
        limit: int,
        cursor: str | None,
        sort_order: ObjectSortOrder,
        compressed: bool | None,
        search: str | None = None,
    ) -> ObjectList:
        cache_key = (bucket, prefix, sort_order.value, compressed, search)
        cached: tuple[list[LogicalObject], list[str]] | None = self.caches.list_cache.get(cache_key)
        if cached is None:
            # Pass a hint to limit items fetched from S3 (fetch slightly more than limit for filtering)
            max_items_hint = limit + 50 if limit < 1000 else None
            # Use quick mode for better performance on initial listing
            listing = self.sdk.list_objects(bucket, prefix, max_items=max_items_hint, quick_mode=True)
            filtered = [obj for obj in listing.objects if compressed is None or obj.compressed == compressed]

            # Apply search filter if provided
            if search:
                search_lower = search.lower()
                filtered = [obj for obj in filtered if search_lower in obj.key.lower()]

            sorted_objects = _sort_objects(filtered, sort_order)
            cached = (sorted_objects, listing.common_prefixes)
            # Only cache if we fetched everything (no max_items limit)
            if max_items_hint is None or len(listing.objects) < max_items_hint:
                self.caches.list_cache.set(cache_key, cached)
        objects, prefixes = cached
        offset = decode_cursor(cursor) or 0
        page = objects[offset : offset + limit]
        next_cursor = encode_cursor(offset + len(page)) if offset + len(page) < len(objects) else None
        return ObjectList(
            objects=[
                ObjectItem(
                    key=obj.key,
                    original_bytes=obj.original_bytes,
                    stored_bytes=obj.stored_bytes,
                    compressed=obj.compressed,
                    modified=obj.modified,
                )
                for obj in page
            ],
            common_prefixes=prefixes,
            cursor=next_cursor,
        )

    def get_metadata(self, bucket: str, key: str) -> FileMetadata:
        cache_key = (bucket, key)
        cached = self.caches.meta_cache.get(cache_key)
        if cached is not None:
            return cached
        metadata = self.sdk.get_metadata(bucket, key)
        self.caches.meta_cache.set(cache_key, metadata)
        return metadata

    def delete_object(self, bucket: str, key: str) -> None:
        try:
            self.sdk.delete_object(bucket, key)
        except APIError:
            raise
        except KeyError as exc:
            raise NotFoundError("object", "key_not_found") from exc
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "")
            if error_code in {"NoSuchKey", "404"}:
                raise NotFoundError("object", "key_not_found") from exc
            logger.error(f"ClientError deleting {bucket}/{key}: {exc}", exc_info=True)
            details = {"reason": _summarize_exception(exc)}
            raise SDKError("Unable to delete object", details=details) from exc
        except Exception as exc:
            logger.error(f"Exception deleting {bucket}/{key}: {type(exc).__name__}: {exc}", exc_info=True)
            details = {"reason": f"{type(exc).__name__}: {_summarize_exception(exc)}"}
            raise SDKError("Unable to delete object", details=details) from exc

        self.invalidate_object(bucket, key)
        self.caches.savings_cache.pop(bucket)

    def bulk_delete_objects(self, bucket: str, keys: list[str]) -> tuple[list[str], list[dict]]:
        """Delete multiple objects and return results."""
        deleted = []
        errors = []

        try:
            self.sdk.delete_objects(bucket, keys)
            deleted = list(keys)
        except NotFoundError:
            # If NotFoundError is raised, we don't know which key(s) failed, so mark all as not found
            for key in keys:
                errors.append({"key": key, "error": "Object not found"})
        except APIError as exc:
            for key in keys:
                errors.append({"key": key, "error": str(exc)})
        except Exception as exc:
            for key in keys:
                logger.error(f"Exception deleting {bucket}/{key}: {type(exc).__name__}: {exc}", exc_info=True)
                errors.append({"key": key, "error": _summarize_exception(exc)})

        # Invalidate caches for all deleted keys
        for key in deleted:
            self.invalidate_object(bucket, key)
        self.caches.savings_cache.pop(bucket)

        return deleted, errors

    def invalidate_object(self, bucket: str, key: str) -> None:
        self.caches.meta_cache.pop((bucket, key))
        for cache_key in list(self.caches.list_cache.keys()):
            cached_bucket, prefix, *_rest = cache_key
            if cached_bucket == bucket and key.startswith(prefix):
                self.caches.list_cache.pop(cache_key)

    def upload_object(
        self,
        bucket: str,
        key: str,
        file_obj: BinaryIO,
        *,
        relative_path: str | None = None,
    ) -> UploadSummary:
        try:
            summary = self.sdk.upload(bucket, key, file_obj)
        except APIError:
            raise
        except Exception as exc:
            details = {"reason": _summarize_exception(exc)}
            raise SDKError("Unable to upload object", details=details) from exc

        if relative_path:
            summary.relative_path = relative_path

        self.invalidate_object(bucket, summary.key)
        self.caches.savings_cache.pop(bucket)
        return summary

    def update_savings(self, bucket: str, snapshot: BucketSnapshot) -> BucketStats:
        bucket_stats = BucketStats(
            name=snapshot.name,
            object_count=snapshot.object_count,
            original_bytes=snapshot.original_bytes,
            stored_bytes=snapshot.stored_bytes,
            savings_pct=snapshot.savings_pct,
            pending=False,
            computed_at=snapshot.computed_at,
        )
        self.caches.savings_cache.set(bucket, bucket_stats)
        self.caches.clear_pending(bucket)
        return bucket_stats

    def mark_pending(self, bucket: str) -> None:
        self.caches.mark_pending(bucket)

    def _purge_bucket_caches(self, bucket: str) -> None:
        self.caches.savings_cache.pop(bucket)
        self.caches.clear_pending(bucket)
        for key in list(self.caches.list_cache.keys()):
            if isinstance(key, tuple) and key and key[0] == bucket:
                self.caches.list_cache.pop(key)
        for key in list(self.caches.meta_cache.keys()):
            if isinstance(key, tuple) and key and key[0] == bucket:
                self.caches.meta_cache.pop(key)


def _summarize_exception(exc: Exception) -> str:
    message = str(exc).strip()
    if not message:
        message = exc.__class__.__name__
    if len(message) > 200:
        return f"{message[:197]}..."
    return message
