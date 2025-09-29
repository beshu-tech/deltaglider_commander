"""Download endpoints."""
from __future__ import annotations

import os
from typing import Generator

from flask import Blueprint, Response, request, stream_with_context

from ..util.errors import APIError
from ..util.json import json_response
from . import get_container


bp = Blueprint("downloads", __name__, url_prefix="/api/download")


@bp.post("/prepare")
def prepare_download():
    container = get_container()
    payload = request.get_json(silent=True) or {}
    bucket = payload.get("bucket")
    key = payload.get("key")
    if not bucket or not key:
        raise APIError(code="invalid_request", message="bucket and key are required", http_status=400)
    preparation = container.downloads.prepare(bucket, key)
    return json_response(preparation.to_dict())


@bp.get("/<token>")
def download(token: str):
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
    response.headers["Content-Disposition"] = f"attachment; filename=\"{filename}\""
    response.headers["X-DG-Logical-ETag"] = token
    response.headers["Accept-Ranges"] = "none"
    return response

