"""Buckets API endpoints."""

from __future__ import annotations

from flask import Blueprint, request

from ..auth.middleware import require_session_or_env
from ..util.errors import APIError, NotFoundError
from ..util.json import json_response
from . import get_container

bp = Blueprint("buckets", __name__, url_prefix="/api/buckets")


@bp.get("/")
@require_session_or_env
def list_buckets():
    from flask import g

    from ..services.catalog import CatalogService

    # Use session SDK with catalog service
    sdk = g.sdk_client
    catalog = CatalogService(sdk=sdk)

    payload = []
    # catalog.list_buckets() already handles exceptions and raises SDKError
    for bucket_stats in catalog.list_buckets(compute_stats=False):
        entry = {
            "name": bucket_stats.name,
            "object_count": bucket_stats.object_count,
            "original_bytes": bucket_stats.original_bytes,
            "stored_bytes": bucket_stats.stored_bytes,
            "savings_pct": bucket_stats.savings_pct,
        }
        payload.append(entry)
    return json_response({"buckets": payload})


@bp.post("/")
@require_session_or_env
def create_bucket():
    from flask import g

    from ..services.catalog import CatalogService

    # Use session SDK
    sdk = g.sdk_client
    catalog = CatalogService(sdk=sdk)

    data = request.get_json(silent=True) or {}
    name = data.get("name")
    if not isinstance(name, str) or not name.strip():
        raise APIError(code="invalid_bucket_name", message="Bucket name is required", http_status=400)
    bucket_name = name.strip()
    catalog.create_bucket(bucket_name)
    return json_response({"status": "created", "bucket": bucket_name}, status=201)


@bp.post("/<bucket>/compute-savings")
@require_session_or_env
def compute_savings(bucket: str):
    import logging

    from flask import g

    logger = logging.getLogger(__name__)
    logger.info(f"[COMPUTE-SAVINGS] Endpoint called for bucket: {bucket}")

    # Always use session SDK - no fallback to container
    sdk = g.sdk_client
    logger.info(f"[COMPUTE-SAVINGS] SDK type: {type(sdk).__name__}")

    if not sdk.bucket_exists(bucket):
        logger.error(f"[COMPUTE-SAVINGS] Bucket not found: {bucket}")
        raise NotFoundError("bucket", "bucket_not_found")

    # Pass session SDK to job so it uses the correct credentials
    container = get_container()
    logger.info(f"[COMPUTE-SAVINGS] Container jobs type: {type(container.jobs).__name__}")
    task_id = container.jobs.enqueue(bucket, sdk=sdk)
    logger.info(f"[COMPUTE-SAVINGS] Job enqueued with task_id: {task_id}")
    return json_response({"status": "accepted", "bucket": bucket, "task_id": task_id}, status=202)


@bp.delete("/<bucket>")
@require_session_or_env
def delete_bucket(bucket: str):
    from flask import g

    from ..services.catalog import CatalogService

    # Use session SDK
    sdk = g.sdk_client
    catalog = CatalogService(sdk=sdk)

    catalog.delete_bucket(bucket)
    return json_response({"status": "deleted", "bucket": bucket})
