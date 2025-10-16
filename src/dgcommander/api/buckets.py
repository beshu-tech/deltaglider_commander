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
    container = get_container()
    jobs = getattr(container, "jobs", None)

    payload = []
    for bucket_stats in catalog.list_buckets(compute_stats=False):
        entry = {
            "name": bucket_stats.name,
            "object_count": bucket_stats.object_count,
            "original_bytes": bucket_stats.original_bytes,
            "stored_bytes": bucket_stats.stored_bytes,
            "savings_pct": bucket_stats.savings_pct,
            "stats_mode": bucket_stats.stats_mode,
            "stats_loaded": bucket_stats.stats_loaded,
            "object_count_is_limited": bucket_stats.object_count_is_limited,
        }

        pending_job = jobs.pending(bucket_stats.name) if jobs else False
        if pending_job:
            entry["pending"] = True
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

    from ..services.catalog import CatalogService

    logger = logging.getLogger(__name__)
    logger.info(f"[COMPUTE-SAVINGS] Endpoint called for bucket: {bucket}")

    # Always use session SDK - no fallback to container
    sdk = g.sdk_client
    logger.info(f"[COMPUTE-SAVINGS] SDK type: {type(sdk).__name__}")

    catalog_service = CatalogService(sdk=sdk)

    if not sdk.bucket_exists(bucket):
        logger.error(f"[COMPUTE-SAVINGS] Bucket not found: {bucket}")
        raise NotFoundError("bucket", "bucket_not_found")

    try:
        catalog_service.invalidate_bucket_stats(bucket)
    except Exception:
        logger.debug(f"[COMPUTE-SAVINGS] Failed to invalidate catalog cache for {bucket}", exc_info=True)

    # Pass session SDK to job so it uses the correct credentials
    container = get_container()
    logger.info(f"[COMPUTE-SAVINGS] Container jobs type: {type(container.jobs).__name__}")
    task_id = container.jobs.enqueue(bucket, sdk=sdk)
    logger.info(f"[COMPUTE-SAVINGS] Job enqueued with task_id: {task_id}")
    return json_response({"status": "accepted", "bucket": bucket, "task_id": task_id}, status=202)


@bp.post("/cache/refresh")
@require_session_or_env
def refresh_bucket_cache():
    from flask import g

    from ..contracts.buckets import BucketStats as BucketStatsContract
    from ..services.catalog import CatalogService
    from ..services.deltaglider import StatsMode

    payload = request.get_json(silent=True) or {}
    mode_param = (payload.get("mode") or "sampled").lower()
    try:
        mode = StatsMode(mode_param)
    except ValueError as exc:
        raise APIError(code="invalid_stats_mode", message="Unsupported stats mode", http_status=400) from exc

    catalog = CatalogService(sdk=g.sdk_client)
    stats_list = catalog.refresh_all_bucket_stats(mode=mode)
    buckets = [
        BucketStatsContract(
            name=stats.name,
            object_count=stats.object_count,
            original_bytes=stats.original_bytes,
            stored_bytes=stats.stored_bytes,
            savings_pct=stats.savings_pct,
            pending=stats.pending,
            computed_at=stats.computed_at,
            stats_mode=stats.stats_mode,
            stats_loaded=stats.stats_loaded,
            object_count_is_limited=stats.object_count_is_limited,
        ).model_dump(mode="json")
        for stats in stats_list
    ]

    return json_response({"status": "refreshed", "mode": mode.value, "buckets": buckets})


@bp.get("/<bucket>/stats")
@require_session_or_env
def bucket_stats(bucket: str):
    from flask import g

    from ..contracts.buckets import BucketStats as BucketStatsContract
    from ..services.catalog import CatalogService
    from ..services.deltaglider import StatsMode

    mode_param = (request.args.get("mode") or "sampled").lower()
    try:
        mode = StatsMode(mode_param)
    except ValueError as exc:
        raise APIError(code="invalid_stats_mode", message="Unsupported stats mode", http_status=400) from exc

    catalog = CatalogService(sdk=g.sdk_client)
    stats = catalog.get_bucket_stats(bucket, mode=mode)

    contract = BucketStatsContract(
        name=stats.name,
        object_count=stats.object_count,
        original_bytes=stats.original_bytes,
        stored_bytes=stats.stored_bytes,
        savings_pct=stats.savings_pct,
        pending=False,
        computed_at=stats.computed_at,
        stats_mode=stats.stats_mode,
        stats_loaded=stats.stats_loaded,
        object_count_is_limited=stats.object_count_is_limited,
    )
    return json_response({"bucket": contract.model_dump(mode="json")})


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
