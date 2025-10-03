"""Buckets API endpoints."""

from __future__ import annotations

from flask import Blueprint, request

from ..util.errors import APIError, NotFoundError
from ..util.json import json_response
from . import get_container

bp = Blueprint("buckets", __name__, url_prefix="/api/buckets")


@bp.get("/")
def list_buckets():
    container = get_container()
    payload = []
    # Use fast listing without expensive stats computation
    for bucket in container.catalog.list_buckets(compute_stats=False):
        entry = {
            "name": bucket.name,
            "object_count": bucket.object_count,
            "original_bytes": bucket.original_bytes,
            "stored_bytes": bucket.stored_bytes,
            "savings_pct": bucket.savings_pct,
        }
        if bucket.pending:
            entry["pending"] = True
        payload.append(entry)
    return json_response({"buckets": payload})


@bp.post("/")
def create_bucket():
    container = get_container()
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    if not isinstance(name, str) or not name.strip():
        raise APIError(code="invalid_bucket_name", message="Bucket name is required", http_status=400)
    bucket_name = name.strip()
    container.catalog.create_bucket(bucket_name)
    return json_response({"status": "created", "bucket": bucket_name}, status=201)


@bp.post("/<bucket>/compute-savings")
def compute_savings(bucket: str):
    container = get_container()
    # Use efficient bucket existence check
    if not container.catalog.bucket_exists(bucket):
        raise NotFoundError("bucket", "bucket_not_found")
    task_id = container.jobs.enqueue(bucket)
    return json_response({"status": "accepted", "bucket": bucket, "task_id": task_id}, status=202)


@bp.delete("/<bucket>")
def delete_bucket(bucket: str):
    container = get_container()
    container.catalog.delete_bucket(bucket)
    return json_response({"status": "deleted", "bucket": bucket})
