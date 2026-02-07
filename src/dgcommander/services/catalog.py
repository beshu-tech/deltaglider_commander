"""Catalog service backed by the DeltaGlider SDK."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
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

# Hard cap on objects fetched from S3 during a single listing request.
# Prevents OOM on directories with millions of files.
LISTING_MAX_OBJECTS = 15_000


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


def _filter_and_sort(
    objects: list[LogicalObject],
    sort_order: ObjectSortOrder,
    compressed: bool | None,
    search_key: str | None,
) -> list[LogicalObject]:
    """Filter and sort objects in a single pass where possible.

    Builds one filtered list, then sorts it in-place to avoid extra copies.
    """
    if compressed is None and not search_key:
        filtered = list(objects)
    else:
        filtered = [
            obj
            for obj in objects
            if (compressed is None or obj.compressed == compressed)
            and (not search_key or search_key in obj.key.lower())
        ]

    reverse = sort_order in {ObjectSortOrder.modified_desc, ObjectSortOrder.name_desc, ObjectSortOrder.size_desc}
    if sort_order in {ObjectSortOrder.name_asc, ObjectSortOrder.name_desc}:
        filtered.sort(key=lambda obj: obj.key, reverse=reverse)
    elif sort_order in {ObjectSortOrder.size_asc, ObjectSortOrder.size_desc}:
        filtered.sort(key=lambda obj: obj.original_bytes, reverse=reverse)
    else:
        filtered.sort(key=lambda obj: obj.modified, reverse=reverse)

    return filtered


class _S3ContextMixin:
    sdk: DeltaGliderSDK

    def _get_s3_error_context(self) -> dict:
        s3_context = extract_s3_context_from_sdk(self.sdk)
        return format_s3_context(s3_context)


@dataclass(slots=True)
class _CatalogCacheManager:
    sdk: DeltaGliderSDK
    list_cache: ListObjectsCache | None = None

    def invalidate_bucket_stats(self, bucket: str) -> None:
        invalidator = getattr(self.sdk, "invalidate_bucket_cache", None)
        if callable(invalidator):
            try:
                invalidator(bucket)
            except Exception:  # pragma: no cover - defensive
                logger.debug("Failed to invalidate stats cache for bucket %s", bucket, exc_info=True)

    def clear_bucket_stats(self) -> None:
        clearer = getattr(self.sdk, "clear_bucket_cache", None)
        if callable(clearer):
            try:
                clearer()
            except Exception:  # pragma: no cover - defensive
                logger.debug("Failed to clear stats cache", exc_info=True)

    def invalidate_listing(self, bucket: str) -> None:
        if self.list_cache is not None:
            self.list_cache.invalidate_bucket(bucket)


@dataclass(slots=True)
class BucketStatsService(_S3ContextMixin):
    sdk: DeltaGliderSDK
    cache_manager: _CatalogCacheManager

    def list_buckets(self, compute_stats: bool = False) -> list[BucketStats]:
        stats: list[BucketStats] = []
        try:
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
            details = {
                "reason": _summarize_exception(exc),
                "aws_error_code": error_code,
                **self._get_s3_error_context(),
            }
            raise SDKError("Unable to check bucket existence", details=details) from exc
        except KeyError:
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
            if error_code == "BucketAlreadyOwnedByYou":
                return
            if error_code == "InvalidBucketName":
                raise APIError(
                    code="invalid_bucket_name",
                    message=error_message or "Bucket name is invalid",
                    http_status=400,
                    details={**context_details, "reason": error_message},
                ) from exc
            if error_code == "TooManyBuckets":
                raise APIError(
                    code="too_many_buckets",
                    message="You have reached the maximum number of buckets allowed",
                    http_status=400,
                    details=context_details,
                ) from exc
            if error_code == "AccessDenied":
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
            self.cache_manager.invalidate_bucket_stats(name)
            self.cache_manager.invalidate_listing(name)
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "")
            context_details = self._get_s3_error_context()

            if error_code in {"NoSuchBucket", "NotFound"}:
                raise NotFoundError("bucket", "bucket_not_found", details=context_details) from exc
            if error_code == "BucketNotEmpty":
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
            raise NotFoundError("bucket", "bucket_not_found")
        except Exception as exc:
            if isinstance(exc, APIError):
                raise
            details = {"reason": _summarize_exception(exc)}
            raise SDKError("Unable to delete bucket", details=details) from exc

    def refresh_all_bucket_stats(self, mode: StatsMode = StatsMode.sampled) -> list[BucketStats]:
        self.cache_manager.clear_bucket_stats()
        if self.cache_manager.list_cache is not None:
            self.cache_manager.list_cache.clear()

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


@dataclass(slots=True)
class ObjectListingService(_S3ContextMixin):
    sdk: DeltaGliderSDK
    list_cache: ListObjectsCache | None
    cache_manager: _CatalogCacheManager

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
        sort_key = sort_order.name
        search_key = search.lower() if search else None
        offset = decode_cursor(cursor) or 0

        cache = self.list_cache if fetch_metadata and not bypass_cache else None

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
                listing = self.sdk.list_objects(bucket, prefix, max_items=LISTING_MAX_OBJECTS, quick_mode=not fetch_metadata)
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
                common_prefixes = common_prefixes or []

            sorted_objects = _filter_and_sort(base_objects, sort_order, compressed, search_key)

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

        # base_objects is set when we fetched from SDK or got the base from cache.
        # When sorted_objects came directly from a cached variant, base_objects is
        # None — fall back to checking the variant length instead.
        fetched_count = len(base_objects) if base_objects is not None else len(sorted_objects)
        limited = fetched_count >= LISTING_MAX_OBJECTS

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


@dataclass(slots=True)
class ObjectMutationService(_S3ContextMixin):
    sdk: DeltaGliderSDK
    cache_manager: _CatalogCacheManager

    def delete_object(self, bucket: str, key: str) -> None:
        try:
            self.sdk.delete_object(bucket, key)
            self.cache_manager.invalidate_listing(bucket)
            self.cache_manager.invalidate_bucket_stats(bucket)
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
        deleted = []
        errors = []

        try:
            self.sdk.delete_objects(bucket, keys)
            deleted = list(keys)
            self.cache_manager.invalidate_listing(bucket)
            self.cache_manager.invalidate_bucket_stats(bucket)
        except NotFoundError:
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
            self.cache_manager.invalidate_listing(bucket)
            self.cache_manager.invalidate_bucket_stats(bucket)
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


@dataclass(slots=True)
class CatalogService:
    sdk: DeltaGliderSDK
    list_cache: ListObjectsCache | None = None
    _cache_manager: _CatalogCacheManager = field(init=False, repr=False)
    _bucket_stats: BucketStatsService = field(init=False, repr=False)
    _object_listing: ObjectListingService = field(init=False, repr=False)
    _object_mutations: ObjectMutationService = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self._cache_manager = _CatalogCacheManager(self.sdk, self.list_cache)
        self._bucket_stats = BucketStatsService(self.sdk, self._cache_manager)
        self._object_listing = ObjectListingService(self.sdk, self.list_cache, self._cache_manager)
        self._object_mutations = ObjectMutationService(self.sdk, self._cache_manager)

    def invalidate_bucket_stats(self, bucket: str) -> None:
        self._cache_manager.invalidate_bucket_stats(bucket)

    def list_buckets(self, compute_stats: bool = False) -> list[BucketStats]:
        return self._bucket_stats.list_buckets(compute_stats)

    def get_bucket_stats(self, bucket: str, *, mode: StatsMode) -> BucketStats:
        return self._bucket_stats.get_bucket_stats(bucket, mode=mode)

    def bucket_exists(self, bucket: str) -> bool:
        return self._bucket_stats.bucket_exists(bucket)

    def create_bucket(self, name: str) -> None:
        self._bucket_stats.create_bucket(name)

    def delete_bucket(self, name: str) -> None:
        self._bucket_stats.delete_bucket(name)

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
        return self._object_listing.list_objects(
            bucket,
            prefix,
            limit,
            cursor,
            sort_order,
            compressed,
            search,
            credentials_key,
            fetch_metadata,
            bypass_cache,
        )

    def get_metadata(self, bucket: str, key: str) -> FileMetadata:
        return self._object_listing.get_metadata(bucket, key)

    def delete_object(self, bucket: str, key: str) -> None:
        self._object_mutations.delete_object(bucket, key)

    def bulk_delete_objects(self, bucket: str, keys: list[str]) -> tuple[list[str], list[dict]]:
        return self._object_mutations.bulk_delete_objects(bucket, keys)

    def upload_object(
        self,
        bucket: str,
        key: str,
        file_obj: BinaryIO,
        *,
        relative_path: str | None = None,
    ) -> UploadSummary:
        return self._object_mutations.upload_object(
            bucket,
            key,
            file_obj,
            relative_path=relative_path,
        )

    def refresh_all_bucket_stats(self, mode: StatsMode = StatsMode.sampled) -> list[BucketStats]:
        return self._bucket_stats.refresh_all_bucket_stats(mode)

    def update_savings(self, bucket: str, snapshot: BucketSnapshot) -> BucketStats:
        return self._bucket_stats.update_savings(bucket, snapshot)

def _summarize_exception(exc: Exception) -> str:
    message = str(exc).strip()
    if not message:
        message = f"Unexpected error of type {type(exc).__name__}"
    lines = message.splitlines()
    if len(lines) <= 2:
        return message
    return ". ".join(lines[:2]) + "..."
