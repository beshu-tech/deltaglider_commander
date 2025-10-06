"""Download endpoints."""

from __future__ import annotations

import os
from collections.abc import Generator

from flask import Blueprint, Response, g, request, stream_with_context

from ..auth.middleware import require_session_or_env
from ..services.downloads import DownloadService
from ..util.errors import APIError
from ..util.json import json_response
from . import get_container

bp = Blueprint("downloads", __name__, url_prefix="/api/download")


@bp.post("/prepare")
@require_session_or_env
def prepare_download():
    import logging

    logger = logging.getLogger(__name__)

    payload = request.get_json(silent=True) or {}
    bucket = payload.get("bucket")
    key = payload.get("key")
    if not bucket or not key:
        raise APIError(code="invalid_request", message="bucket and key are required", http_status=400)

    # Use session SDK and embed credentials in token
    sdk = g.sdk_client
    credentials = g.credentials  # Get credentials from session

    logger.info(f"Prepare download - credentials keys: {credentials.keys() if credentials else 'None'}")
    logger.info(f"Prepare download - endpoint: {credentials.get('endpoint') if credentials else 'None'}")
    logger.info(f"Prepare download - region: {credentials.get('region') if credentials else 'None'}")

    container = get_container()
    downloads = DownloadService(
        sdk=sdk, secret_key=container.downloads.secret_key, ttl_seconds=container.downloads.ttl_seconds
    )

    preparation = downloads.prepare(bucket, key, credentials=credentials)
    return json_response(preparation.to_dict())


@bp.get("/<token>")
def download(token: str):
    # Token-based download doesn't need session - token is already signed
    container = get_container()
    bucket, key, stream = container.downloads.resolve_token(token)

    def iterator(chunk_size: int = 8 * 1024 * 1024) -> Generator[bytes, None, None]:
        try:
            while True:
                chunk = stream.read(chunk_size)
                if not chunk:
                    break
                yield chunk
        finally:
            stream.close()

    response = Response(stream_with_context(iterator()), mimetype="application/octet-stream")
    filename = os.path.basename(key) or "download"
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    response.headers["X-DG-Logical-ETag"] = token
    response.headers["Accept-Ranges"] = "none"
    return response
