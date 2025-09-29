"""Objects API endpoints."""
from __future__ import annotations

from flask import Blueprint, request

from ..application.use_cases.list_objects import ListObjectsUseCase
from ..common.decorators import api_endpoint, cached, with_timing
from ..contracts.objects import (
    DeleteObjectRequest,
    FileMetadata,
    ObjectListRequest,
    ObjectListResponse,
)
from ..infrastructure.repositories.s3_object_repository import S3ObjectRepository
from ..util.errors import NotFoundError
from . import get_container


bp = Blueprint("objects", __name__, url_prefix="/api/objects")


@bp.get("/")
@api_endpoint(request_model=ObjectListRequest, response_model=ObjectListResponse, validate_query=True)
@with_timing("list_objects")
@cached(ttl_seconds=30)
async def list_objects(query: ObjectListRequest):
    """List objects with automatic validation and serialization."""
    container = get_container()
    sdk = container.extensions["dgcommander"].catalog.sdk
    repository = S3ObjectRepository(sdk)

    use_case = ListObjectsUseCase(repository)
    return await use_case.execute(query)


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
