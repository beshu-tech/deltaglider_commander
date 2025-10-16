"""Download endpoints using presigned URLs."""

from __future__ import annotations

from flask import Blueprint, g, request

from ..auth.middleware import require_session_or_env
from ..services.presigned import PresignedUrlService
from ..util.errors import APIError
from ..util.json import json_response

bp = Blueprint("downloads", __name__, url_prefix="/api/download")


@bp.post("/presigned-url")
@require_session_or_env
def generate_presigned_url():
    """Generate a presigned URL for downloading an object."""
    import logging

    logger = logging.getLogger(__name__)

    payload = request.get_json(silent=True) or {}
    bucket = payload.get("bucket")
    key = payload.get("key")
    expires_in = payload.get("expires_in", 3600)  # Default 1 hour
    with_rehydration = payload.get("with_rehydration", True)

    if not bucket or not key:
        raise APIError(code="invalid_request", message="bucket and key are required", http_status=400)

    # Validate expires_in
    if not isinstance(expires_in, int) or expires_in < 60 or expires_in > 604800:  # 1 min to 7 days
        raise APIError(
            code="invalid_request", message="expires_in must be between 60 and 604800 seconds", http_status=400
        )

    # Use session SDK
    sdk = g.sdk_client

    logger.info(f"Generate presigned URL - bucket: {bucket}, key: {key}")
    logger.info(f"Expires in: {expires_in} seconds, with_rehydration: {with_rehydration}")

    presigned_service = PresignedUrlService(sdk=sdk)

    response = presigned_service.generate_presigned_url(
        bucket=bucket, key=key, expires_in=expires_in, with_rehydration=with_rehydration
    )

    return json_response(response.to_dict())
