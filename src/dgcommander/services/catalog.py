"""Catalog service backed by the DeltaGlider SDK."""

from __future__ import annotations

import logging
from collections.abc import Iterable
from dataclasses import dataclass
from typing import BinaryIO

from botocore.exceptions import ClientError

from ..util.errors import APIError, NotFoundError, SDKError
from ..util.paging import decode_cursor, encode_cursor
from ..util.s3_context import extract_s3_context_from_sdk, format_s3_context
from ..util.types import BucketStats, ObjectItem, ObjectList, ObjectSortOrder
from .deltaglider import (
    BucketSnapshot,
    DeltaGliderSDK,
    FileMetadata,
    LogicalObject,
    StatsMode,
    UploadSummary,
)
from .list_cache import ListObjectsCache

logger = logging.getLogger(__name__)

OBJECT_COUNT_LIMIT = 15_000


def _clamp_savings_pct(original_bytes: int, stored_bytes: int) -> float:
    if original_bytes <= 0:
        return 0.0
    ratio = 1.0 - (stored_bytes / original_bytes)
    pct = ratio * 100.0
    return max(0.0, min(100.0, pct))


def _build_bucket_stats(
    snapshot: BucketSnapshot,
    *,
    mode: StatsMode,
    pending: bool,
    force_loaded: bool = False,
) -> BucketStats:
    limited_from_snapshot = getattr(snapshot, "object_count_is_limited", False)
    limited = limited_from_snapshot or snapshot.object_count > OBJECT_COUNT_LIMIT
    object_count = snapshot.object_count
    if limited and object_count > OBJECT_COUNT_LIMIT:
        object_count = OBJECT_COUNT_LIMIT
    savings_pct = _clamp_savings_pct(snapshot.original_bytes, snapshot.stored_bytes)
    stats_loaded = force_loaded or bool(snapshot.computed_at)

    return BucketStats(
        name=snapshot.name,
        object_count=object_count,
        original_bytes=snapshot.original_bytes,
        stored_bytes=snapshot.stored_bytes,
        savings_pct=savings_pct,
        pending=pending,
        computed_at=snapshot.computed_at,
        stats_mode=mode.value,
        stats_loaded=stats_loaded,
        object_count_is_limited=limited,
    )


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
    list_cache: ListObjectsCache | None = None

    def _invalidate_bucket_stats_cache(self, bucket: str) -> None:
        invalidator = getattr(self.sdk, "invalidate_bucket_cache", None)
        if callable(invalidator):
            try:
                invalidator(bucket)
            except Exception:  # pragma: no cover - defensive
                logger.debug("Failed to invalidate stats cache for bucket %s", bucket, exc_info=True)

    def _clear_bucket_stats_cache(self) -> None:
        clearer = getattr(self.sdk, "clear_bucket_cache", None)
        if callable(clearer):
            try:
                clearer()
            except Exception:  # pragma: no cover - defensive
                logger.debug("Failed to clear stats cache", exc_info=True)

    def _get_s3_error_context(self) -> dict:
        """Extract S3 context for error reporting.

        Returns:
            Dictionary with s3_endpoint, s3_access_key, and s3_region fields.
        """
        s3_context = extract_s3_context_from_sdk(self.sdk)
        return format_s3_context(s3_context)

    def invalidate_bucket_stats(self, bucket: str) -> None:
        """Expose cache invalidation for other components."""
        self._invalidate_bucket_stats_cache(bucket)

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

        mode = StatsMode.detailed if compute_stats else StatsMode.quick
        for snapshot in snapshots:
            stats.append(
                _build_bucket_stats(
                    snapshot,
                    mode=mode,
                    pending=False,
                    force_loaded=compute_stats,
                )
            )

        return stats

    def get_bucket_stats(self, bucket: str, *, mode: StatsMode) -> BucketStats:
        try:
            snapshot = self.sdk.compute_bucket_stats(bucket, mode=mode)
        except ValueError as exc:
            raise NotFoundError("bucket", "bucket_not_found") from exc
        except Exception as exc:
            if isinstance(exc, APIError):
                raise
            details = {"reason": _summarize_exception(exc)}
            raise SDKError("Unable to compute bucket statistics", details=details) from exc

        return _build_bucket_stats(
            snapshot,
            mode=mode,
            pending=False,
            force_loaded=True,
        )

    def bucket_exists(self, bucket: str) -> bool:
        try:
            return self.sdk.bucket_exists(bucket)
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "")
            if error_code in {"NoSuchBucket", "NotFound"}:
                return False
            # For other S3 errors, include context
            details = {
                "reason": _summarize_exception(exc),
                "aws_error_code": error_code,
                **self._get_s3_error_context(),
            }
            raise SDKError("Unable to check bucket existence", details=details) from exc
        except KeyError:
            # In-memory SDK - KeyError means bucket doesn't exist
            return False
        except Exception as exc:
            if isinstance(exc, APIError):
                raise
            details = {
                "reason": _summarize_exception(exc),
                **self._get_s3_error_context(),
            }
            raise SDKError("Unable to check bucket existence", details=details) from exc

    def create_bucket(self, name: str) -> None:
        try:
            self.sdk.create_bucket(name)
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "")
            error_message = exc.response.get("Error", {}).get("Message", "")
            context_details = self._get_s3_error_context()

            if error_code == "BucketAlreadyExists":
                raise APIError(
                    code="bucket_exists",
                    message="Bucket already exists",
                    http_status=409,
                    details=context_details,
                ) from exc
            elif error_code == "BucketAlreadyOwnedByYou":
                # Bucket exists but is owned by the user, treat as success
                return
            elif error_code == "InvalidBucketName":
                raise APIError(
                    code="invalid_bucket_name",
                    message=error_message or "Bucket name is invalid",
                    http_status=400,
                    details={**context_details, "reason": error_message},
                ) from exc
            elif error_code == "TooManyBuckets":
                raise APIError(
                    code="too_many_buckets",
                    message="You have reached the maximum number of buckets allowed",
                    http_status=400,
                    details=context_details,
                ) from exc
            elif error_code == "AccessDenied":
                raise APIError(
                    code="access_denied",
                    message="You don't have permission to create buckets",
                    http_status=403,
                    details=context_details,
                ) from exc
            raise APIError(
                code="bucket_create_failed",
                message=error_message or "Unable to create bucket",
                http_status=500,
                details={**context_details, "aws_error_code": error_code, "reason": error_message},
            ) from exc
        except ValueError as exc:
            # InMemoryDeltaGliderSDK raises ValueError for existing bucket
            if "already exists" in str(exc).lower():
                raise APIError(code="bucket_exists", message="Bucket already exists", http_status=409) from exc
            raise APIError(code="bucket_create_failed", message="Unable to create bucket", http_status=500) from exc
        except Exception as exc:
            if isinstance(exc, APIError):
                raise
            details = {"reason": _summarize_exception(exc)}
            raise SDKError("Unable to create bucket", details=details) from exc

    def delete_bucket(self, name: str) -> None:
        try:
            self.sdk.delete_bucket(name)
            self._invalidate_bucket_stats_cache(name)
            if self.list_cache is not None:
                self.list_cache.invalidate_bucket(name)
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "")
            context_details = self._get_s3_error_context()

            if error_code in {"NoSuchBucket", "NotFound"}:
                raise NotFoundError("bucket", "bucket_not_found", details=context_details) from exc
            elif error_code == "BucketNotEmpty":
                raise APIError(
                    code="bucket_not_empty",
                    message="Bucket is not empty",
                    http_status=409,
                    details=context_details,
                ) from exc
            raise APIError(
                code="bucket_delete_failed",
                message="Unable to delete bucket",
                http_status=500,
                details={**context_details, "aws_error_code": error_code},
            ) from exc
        except KeyError:
            # InMemoryDeltaGliderSDK raises KeyError for non-existent bucket
            raise NotFoundError("bucket", "bucket_not_found")
        except Exception as exc:
            if isinstance(exc, APIError):
                raise
            details = {"reason": _summarize_exception(exc)}
            raise SDKError("Unable to delete bucket", details=details) from exc

    def list_objects(
        self,
        bucket: str,
        prefix: str,
        limit: int,
        cursor: str | None,
        sort_order: ObjectSortOrder,
        compressed: bool | None,
        search: str | None = None,
        credentials_key: str | None = None,
        fetch_metadata: bool = True,
        bypass_cache: bool = False,
    ) -> ObjectList:
        # Try to get from cache first (if cache and credentials_key provided)
        # IMPORTANT: Only use cache when fetch_metadata=True to avoid storing incomplete preview data
        sort_key = sort_order.name
        search_key = search.lower() if search else None
        offset = decode_cursor(cursor) or 0

        cache = self.list_cache if fetch_metadata and not bypass_cache else None

        # When bypassing, invalidate existing cache so subsequent requests also get fresh data
        if bypass_cache and self.list_cache is not None:
            self.list_cache.invalidate_bucket(bucket)

        sorted_objects: list[LogicalObject] | None = None
        base_objects: list[LogicalObject] | None = None
        common_prefixes: list[str] = []

        if cache is not None and credentials_key is not None:
            lookup = cache.get_variant(credentials_key, bucket, prefix, sort_key, compressed, search_key)
            if lookup is not None:
                if lookup.common_prefixes is not None:
                    common_prefixes = lookup.common_prefixes
                if lookup.variant is not None:
                    sorted_objects = lookup.variant
                else:
                    base_objects = lookup.base_objects or []

        if sorted_objects is None:
            if base_objects is None:
                listing = self.sdk.list_objects(bucket, prefix, max_items=None, quick_mode=not fetch_metadata)
                base_objects = list(listing.objects)
                common_prefixes = list(listing.common_prefixes)

                if cache is not None and credentials_key is not None:
                    cache.prime_listing(
                        credentials_key,
                        bucket,
                        prefix,
                        base_objects,
                        list(listing.common_prefixes),
                    )
            else:
                # Base objects came from cache; ensure we use stored prefixes
                common_prefixes = common_prefixes or []

            filtered = [obj for obj in base_objects if compressed is None or obj.compressed == compressed]

            if search_key:
                filtered = [obj for obj in filtered if search_key in obj.key.lower()]

            sorted_objects = _sort_objects(filtered, sort_order)

            if cache is not None and credentials_key is not None:
                cache.store_variant(
                    credentials_key,
                    bucket,
                    prefix,
                    sort_key,
                    compressed,
                    search_key,
                    sorted_objects,
                )

        page = sorted_objects[offset : offset + limit]
        next_cursor = encode_cursor(offset + len(page)) if offset + len(page) < len(sorted_objects) else None

        # Check if listing was truncated at OBJECT_COUNT_LIMIT
        limited = len(sorted_objects) >= OBJECT_COUNT_LIMIT

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
            common_prefixes=common_prefixes,
            cursor=next_cursor,
            limited=limited,
        )

    def get_metadata(self, bucket: str, key: str) -> FileMetadata:
        metadata = self.sdk.get_metadata(bucket, key)
        return metadata

    def delete_object(self, bucket: str, key: str) -> None:
        try:
            self.sdk.delete_object(bucket, key)
            # Invalidate cache for this bucket
            if self.list_cache is not None:
                self.list_cache.invalidate_bucket(bucket)
            self._invalidate_bucket_stats_cache(bucket)
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "")
            context_details = self._get_s3_error_context()

            if error_code in {"NoSuchKey", "NotFound"}:
                raise NotFoundError("object", "object_not_found", details=context_details) from exc
            raise APIError(
                code="delete_failed",
                message="Unable to delete object",
                http_status=500,
                details={**context_details, "aws_error_code": error_code},
            ) from exc
        except Exception as exc:
            logger.error(f"Exception deleting {bucket}/{key}: {type(exc).__name__}: {exc}", exc_info=True)
            details = {"reason": f"{type(exc).__name__}: {_summarize_exception(exc)}"}
            raise SDKError("Unable to delete object", details=details) from exc

    def bulk_delete_objects(self, bucket: str, keys: list[str]) -> tuple[list[str], list[dict]]:
        """Delete multiple objects and return results."""
        deleted = []
        errors = []

        try:
            self.sdk.delete_objects(bucket, keys)
            deleted = list(keys)
            # Invalidate cache for this bucket after successful delete
            if self.list_cache is not None:
                self.list_cache.invalidate_bucket(bucket)
            self._invalidate_bucket_stats_cache(bucket)
        except NotFoundError:
            # If NotFoundError is raised, we don't know which key(s) failed, so mark all as not found
            for key in keys:
                errors.append({"key": key, "error": "Object not found"})
        except APIError as exc:
            for key in keys:
                errors.append({"key": key, "error": str(exc)})
        except Exception as exc:
            logger.error(f"Exception deleting {bucket}/{key}: {type(exc).__name__}: {exc}", exc_info=True)
            for key in keys:
                errors.append({"key": key, "error": _summarize_exception(exc)})

        return deleted, errors

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
            # Invalidate cache for this bucket after successful upload
            if self.list_cache is not None:
                self.list_cache.invalidate_bucket(bucket)
            self._invalidate_bucket_stats_cache(bucket)
        except APIError:
            raise
        except ClientError as exc:
            error = exc.response.get("Error", {}) if hasattr(exc, "response") else {}
            error_code = str(error.get("Code", "") or "")
            context_details = self._get_s3_error_context()

            if error_code == "AccessDenied":
                raise APIError(
                    code="s3_access_denied",
                    message="Access denied. Please verify your S3 credentials and bucket permissions.",
                    http_status=403,
                    details=context_details,
                ) from exc
            details = {"reason": _summarize_exception(exc), **context_details}
            if error_code:
                details["aws_error_code"] = error_code
            raise SDKError("Unable to upload object", details=details) from exc
        except Exception as exc:
            # Check if the error message contains AccessDenied (from DeltaGlider SDK wrapper)
            context_details = self._get_s3_error_context()

            exc_str = str(exc).lower()
            if "accessdenied" in exc_str or "access denied" in exc_str:
                raise APIError(
                    code="s3_access_denied",
                    message="Access denied. Please verify your S3 credentials and bucket permissions.",
                    http_status=403,
                    details=context_details,
                ) from exc
            details = {"reason": _summarize_exception(exc), **context_details}
            raise SDKError("Unable to upload object", details=details) from exc

        if relative_path:
            summary.relative_path = relative_path

        return summary

    def refresh_all_bucket_stats(self, mode: StatsMode = StatsMode.sampled) -> list[BucketStats]:
        """Clear cached stats and recompute for every bucket."""

        self._clear_bucket_stats_cache()
        if self.list_cache is not None:
            self.list_cache.clear()

        try:
            snapshots = list(self.sdk.list_buckets(compute_stats=False))
        except Exception as exc:
            if isinstance(exc, APIError):
                raise
            details = {"reason": _summarize_exception(exc)}
            raise SDKError("Unable to list DeltaGlider buckets", details=details) from exc

        refreshed: list[BucketStats] = []
        for base_snapshot in snapshots:
            try:
                snapshot = self.sdk.compute_bucket_stats(base_snapshot.name, mode=mode)
            except Exception as exc:
                logger.error("Failed to recompute stats for %s: %s", base_snapshot.name, exc, exc_info=True)
                raise SDKError(
                    "Unable to recompute bucket statistics",
                    details={"bucket": base_snapshot.name, "reason": _summarize_exception(exc)},
                ) from exc
            updater = getattr(self.sdk, "update_cached_bucket_stats", None)
            if callable(updater):
                try:
                    updater(snapshot)
                except Exception:  # pragma: no cover - defensive
                    logger.debug("Failed to update SDK cache for %s", snapshot.name, exc_info=True)
            refreshed.append(
                _build_bucket_stats(
                    snapshot,
                    mode=mode,
                    pending=False,
                    force_loaded=True,
                )
            )
        return refreshed

    def update_savings(self, bucket: str, snapshot: BucketSnapshot) -> BucketStats:
        """Update bucket statistics after a savings computation job."""
        updater = getattr(self.sdk, "update_cached_bucket_stats", None)
        if callable(updater):
            try:
                updater(snapshot)
            except Exception:  # pragma: no cover - defensive
                logger.debug("Failed to push snapshot to SDK cache", exc_info=True)
        bucket_stats = BucketStats(
            name=snapshot.name,
            object_count=snapshot.object_count,
            original_bytes=snapshot.original_bytes,
            stored_bytes=snapshot.stored_bytes,
            savings_pct=snapshot.savings_pct,
            pending=False,
            computed_at=snapshot.computed_at,
        )
        return bucket_stats


def _summarize_exception(exc: Exception) -> str:
    message = str(exc).strip()
    if not message:
        message = f"Unexpected error of type {type(exc).__name__}"
    lines = message.splitlines()
    if len(lines) <= 2:
        return message
    return ". ".join(lines[:2]) + "..."
