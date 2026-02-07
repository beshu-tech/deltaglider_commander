"""Objects API endpoints."""

from __future__ import annotations

from flask import Blueprint, request

from ..auth.middleware import require_session_or_env
from ..common.decorators import api_endpoint, with_timing
from ..contracts.objects import (
    BulkDeleteRequest,
    BulkDeleteResponse,
    ObjectItem,
    ObjectListRequest,
    ObjectListResponse,
    ObjectSortOrder,
)
from ..util.errors import APIError, NotFoundError
from ..util.json import json_response
from .dependencies import get_catalog, get_credentials
from .uploads import _enforce_rate_limit

bp = Blueprint("objects", __name__, url_prefix="/api/objects")


@bp.get("/")
@require_session_or_env
@api_endpoint(request_model=ObjectListRequest, response_model=ObjectListResponse, validate_query=True)
@with_timing("list_objects")
def list_objects(query: ObjectListRequest):
    """List objects with automatic validation and serialization."""
    catalog = get_catalog()

    sort_order = ObjectSortOrder.from_query(query.sort, query.order)

    # Check if bucket exists efficiently
    if not catalog.bucket_exists(query.bucket):
        raise NotFoundError("bucket", "bucket_not_found")

    # Generate credentials cache key for cache isolation (security)
    # This allows cache sharing across sessions/browsers with same credentials
    from ..services.list_cache import make_credentials_cache_key

    credentials = get_credentials()
    credentials_key = make_credentials_cache_key(credentials)

    try:
        # Use the catalog's list_objects method with proper parameters
        object_list = catalog.list_objects(
            bucket=query.bucket,
            prefix=query.prefix,
            limit=query.limit,
            cursor=query.cursor,
            sort_order=sort_order,
            compressed=query.compressed,
            search=query.search,
            credentials_key=credentials_key,  # SECURITY: Isolate cache by credentials
            fetch_metadata=query.fetch_metadata,
            bypass_cache=query.bypass_cache,
        )
    except KeyError:
        raise NotFoundError("bucket", "bucket_not_found")

    # Convert util.types.ObjectItem to contracts.ObjectItem
    converted_objects = []
    for util_obj in object_list.objects:
        contract_obj = ObjectItem(
            key=util_obj.key,
            original_bytes=util_obj.original_bytes,
            stored_bytes=util_obj.stored_bytes,
            compressed=util_obj.compressed,
            modified=util_obj.modified,
        )
        converted_objects.append(contract_obj)

    return ObjectListResponse(
        objects=converted_objects,
        common_prefixes=object_list.common_prefixes,
        cursor=object_list.cursor,
        limited=object_list.limited,
    )


@bp.get("/<bucket>/<path:key>/metadata")
@require_session_or_env
def object_metadata(bucket: str, key: str):
    catalog = get_catalog()
    try:
        metadata = catalog.get_metadata(bucket, key)
    except KeyError as exc:
        raise NotFoundError("object", "key_not_found") from exc
    return json_response(metadata.to_dict())


@bp.delete("/<bucket>/<path:key>")
@require_session_or_env
def delete_object(bucket: str, key: str):
    _enforce_rate_limit(request)
    catalog = get_catalog()
    try:
        catalog.delete_object(bucket, key)
    except NotFoundError:
        raise
    except APIError:
        raise
    except KeyError as exc:
        raise NotFoundError("object", "key_not_found") from exc
    return json_response({"status": "deleted", "bucket": bucket, "key": key})


@bp.delete("/bulk")
@require_session_or_env
@api_endpoint(request_model=BulkDeleteRequest, response_model=BulkDeleteResponse)
@with_timing("bulk_delete_objects")
def bulk_delete_objects(data: BulkDeleteRequest):
    """Delete multiple objects in bulk."""
    _enforce_rate_limit(request)
    catalog = get_catalog()

    # Check if bucket exists efficiently
    if not catalog.bucket_exists(data.bucket):
        raise NotFoundError("bucket", "bucket_not_found")

    deleted, errors = catalog.bulk_delete_objects(data.bucket, data.keys)

    return BulkDeleteResponse(
        deleted=deleted,
        errors=errors,
        total_requested=len(data.keys),
        total_deleted=len(deleted),
        total_errors=len(errors),
    )
