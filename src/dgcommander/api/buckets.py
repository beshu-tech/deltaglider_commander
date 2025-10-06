"""Buckets API endpoints."""

from __future__ import annotations

from flask import Blueprint, request

from ..auth.middleware import require_session_or_env
from ..util.errors import APIError, NotFoundError, SDKError
from ..util.json import json_response
from . import get_container

bp = Blueprint("buckets", __name__, url_prefix="/api/buckets")


@bp.get("/")
@require_session_or_env
def list_buckets():
    import logging

    from flask import g

    logger = logging.getLogger(__name__)

    # Debug: Check what's in g
    logger.info(f"g has sdk_client: {hasattr(g, 'sdk_client')}")
    if hasattr(g, "sdk_client"):
        logger.info(f"g.sdk_client type: {type(g.sdk_client).__name__}")
        logger.info(f"g.sdk_client is None: {g.sdk_client is None}")
        if hasattr(g.sdk_client, "_settings"):
            logger.info(f"SDK endpoint: {g.sdk_client._settings.endpoint_url}")

    # Use session SDK if available, otherwise fallback to container SDK
    sdk = g.sdk_client if hasattr(g, "sdk_client") and g.sdk_client is not None else get_container().catalog.sdk

    logger.info(f"Using SDK type: {type(sdk).__name__}")
    if hasattr(sdk, "_settings"):
        logger.info(f"SDK endpoint: {sdk._settings.endpoint_url}")

    try:
        payload = []
        # Use fast listing without expensive stats computation
        for bucket in sdk.list_buckets(compute_stats=False):
            entry = {
                "name": bucket.name,
                "object_count": bucket.object_count,
                "original_bytes": bucket.original_bytes,
                "stored_bytes": bucket.stored_bytes,
                "savings_pct": bucket.savings_pct,
            }
            payload.append(entry)
        return json_response({"buckets": payload})
    except Exception as e:
        raise SDKError("Unable to list DeltaGlider buckets", details={"reason": str(e)})


@bp.post("/")
@require_session_or_env
def create_bucket():
    from flask import g

    from ..services.catalog import CatalogService

    # Use session SDK
    sdk = g.sdk_client
    catalog = CatalogService(sdk=sdk, caches=get_container().catalog.caches)

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
    from flask import g

    # Always use session SDK - no fallback to container
    sdk = g.sdk_client

    if not sdk.bucket_exists(bucket):
        raise NotFoundError("bucket", "bucket_not_found")

    # Jobs still use container for now (could be refactored to use session SDK)
    container = get_container()
    task_id = container.jobs.enqueue(bucket)
    return json_response({"status": "accepted", "bucket": bucket, "task_id": task_id}, status=202)


@bp.delete("/<bucket>")
@require_session_or_env
def delete_bucket(bucket: str):
    from flask import g

    from ..services.catalog import CatalogService

    # Use session SDK
    sdk = g.sdk_client
    catalog = CatalogService(sdk=sdk, caches=get_container().catalog.caches)

    catalog.delete_bucket(bucket)
    return json_response({"status": "deleted", "bucket": bucket})
