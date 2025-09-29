"""Objects API endpoints."""
from __future__ import annotations

from flask import Blueprint, Request, request

from ..util.errors import APIError, NotFoundError
from ..util.json import json_response
from ..util.paging import coerce_limit
from ..util.types import ObjectSortOrder
from . import get_container


bp = Blueprint("objects", __name__, url_prefix="/api/objects")


def _enforce_rate_limit(req: Request) -> None:
    container = get_container()
    container.rate_limiter.enforce(req)


def _parse_compressed(value: str | None) -> bool | None:
    if value is None or value == "any":
        return None
    if value.lower() in {"true", "1"}:
        return True
    if value.lower() in {"false", "0"}:
        return False
    raise APIError(code="invalid_filter", message="Invalid compressed filter", http_status=400)


@bp.get("/")
def list_objects():
    _enforce_rate_limit(request)
    container = get_container()
    bucket = request.args.get("bucket")
    if not bucket:
        raise APIError(code="invalid_bucket", message="bucket query parameter is required", http_status=400)
    known_buckets = {b.name for b in container.catalog.list_buckets()}
    if bucket not in known_buckets:
        raise NotFoundError("bucket", "bucket_not_found")
    prefix = request.args.get("prefix", "")
    cursor = request.args.get("cursor")
    sort = request.args.get("sort")
    order = request.args.get("order")
    compressed = _parse_compressed(request.args.get("compressed"))
    limit = coerce_limit(request.args.get("limit"))
    sort_order = ObjectSortOrder.from_query(sort, order)
    object_list = container.catalog.list_objects(
        bucket=bucket,
        prefix=prefix,
        limit=limit,
        cursor=cursor,
        sort_order=sort_order,
        compressed=compressed,
    )
    return json_response(object_list.to_dict())


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
