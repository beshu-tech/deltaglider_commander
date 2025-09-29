"""Clean objects API using single implementation pattern."""

from __future__ import annotations

from flask import Blueprint

from ..application.use_cases.list_objects import ListObjectsUseCase
from ..common.decorators import api_endpoint, cached, with_timing
from ..contracts.objects import (
    DeleteObjectRequest,
    FileMetadata,
    ObjectListRequest,
    ObjectListResponse,
)
from ..infrastructure.repositories.s3_object_repository import S3ObjectRepository
from ..services.simplified_deltaglider import SimplifiedDeltaGliderSDK
from ..util.errors import NotFoundError
from . import get_container

bp = Blueprint("objects", __name__, url_prefix="/api/objects")


def _get_repository() -> S3ObjectRepository:
    """Get repository instance - single way to access storage."""
    container = get_container()
    config = container.extensions["dgcommander"].config
    sdk = SimplifiedDeltaGliderSDK(config.s3)
    return S3ObjectRepository(sdk)


@bp.get("/")
@api_endpoint(request_model=ObjectListRequest, response_model=ObjectListResponse, validate_query=True)
@with_timing("list_objects")
@cached(ttl_seconds=30)
async def list_objects(query: ObjectListRequest):
    """List objects - ONE way to do it."""
    repository = _get_repository()
    use_case = ListObjectsUseCase(repository)
    return await use_case.execute(query)


@bp.get("/<bucket>/<path:key>/metadata")
@api_endpoint(response_model=FileMetadata)
@with_timing("get_object_metadata")
@cached(ttl_seconds=300)
async def get_object_metadata(bucket: str, key: str):
    """Get object metadata - ONE way to do it."""
    repository = _get_repository()
    metadata = await repository.get_object_metadata(bucket, key)
    if metadata is None:
        raise NotFoundError("object", "object_not_found")
    return metadata


@bp.delete("/<bucket>/<path:key>")
@api_endpoint(response_model=None)
@with_timing("delete_object")
async def delete_object(bucket: str, key: str):
    """Delete object - ONE way to do it."""
    repository = _get_repository()
    request_data = DeleteObjectRequest(bucket=bucket, key=key)

    success = await repository.delete_object(request_data.bucket, request_data.key)
    if not success:
        raise NotFoundError("object", "object_not_found")

    return {"status": "deleted", "bucket": bucket, "key": key}
