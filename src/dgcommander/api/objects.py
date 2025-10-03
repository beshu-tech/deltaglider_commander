"""Objects API endpoints."""

from __future__ import annotations

from flask import Blueprint, request

from ..common.decorators import api_endpoint, cached, with_timing
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
from . import get_container
from .uploads import _enforce_rate_limit

bp = Blueprint("objects", __name__, url_prefix="/api/objects")


@bp.get("/")
@api_endpoint(request_model=ObjectListRequest, response_model=ObjectListResponse, validate_query=True)
@with_timing("list_objects")
@cached(ttl_seconds=30)
def list_objects(query: ObjectListRequest):
    """List objects with automatic validation and serialization."""
    container = get_container()
    catalog = container.catalog

    # Convert ObjectSortOrder from contracts to util.types
    from ..util.types import ObjectSortOrder as UtilObjectSortOrder

    sort_order_map = {
        ObjectSortOrder.name_asc: UtilObjectSortOrder.name_asc,
        ObjectSortOrder.name_desc: UtilObjectSortOrder.name_desc,
        ObjectSortOrder.modified_asc: UtilObjectSortOrder.modified_asc,
        ObjectSortOrder.modified_desc: UtilObjectSortOrder.modified_desc,
        ObjectSortOrder.size_asc: UtilObjectSortOrder.size_asc,
        ObjectSortOrder.size_desc: UtilObjectSortOrder.size_desc,
    }

    contract_sort_order = ObjectSortOrder.from_query(query.sort, query.order)
    util_sort_order = sort_order_map[contract_sort_order]

    # Check if bucket exists efficiently
    if not catalog.bucket_exists(query.bucket):
        raise NotFoundError("bucket", "bucket_not_found")

    try:
        # Use the catalog's list_objects method with proper parameters
        object_list = catalog.list_objects(
            bucket=query.bucket,
            prefix=query.prefix,
            limit=query.limit,
            cursor=query.cursor,
            sort_order=util_sort_order,
            compressed=query.compressed,
            search=query.search,
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
        objects=converted_objects, common_prefixes=object_list.common_prefixes, cursor=object_list.cursor
    )


@bp.get("/<bucket>/<path:key>/metadata")
def object_metadata(bucket: str, key: str):
    container = get_container()
    try:
        metadata = container.catalog.get_metadata(bucket, key)
    except KeyError as exc:
        raise NotFoundError("object", "key_not_found") from exc
    return json_response(metadata.to_dict())


@bp.delete("/<bucket>/<path:key>")
def delete_object(bucket: str, key: str):
    _enforce_rate_limit(request)
    container = get_container()
    try:
        container.catalog.delete_object(bucket, key)
    except NotFoundError:
        raise
    except APIError:
        raise
    except KeyError as exc:
        raise NotFoundError("object", "key_not_found") from exc
    return json_response({"status": "deleted", "bucket": bucket, "key": key})


@bp.delete("/bulk")
@api_endpoint(request_model=BulkDeleteRequest, response_model=BulkDeleteResponse)
@with_timing("bulk_delete_objects")
def bulk_delete_objects(data: BulkDeleteRequest):
    """Delete multiple objects in bulk."""
    _enforce_rate_limit(request)
    container = get_container()

    # Check if bucket exists efficiently
    if not container.catalog.bucket_exists(data.bucket):
        raise NotFoundError("bucket", "bucket_not_found")

    deleted, errors = container.catalog.bulk_delete_objects(data.bucket, data.keys)

    return BulkDeleteResponse(
        deleted=deleted,
        errors=errors,
        total_requested=len(data.keys),
        total_deleted=len(deleted),
        total_errors=len(errors)
    )
