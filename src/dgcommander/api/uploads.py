"""Upload API endpoints for handling file ingestion."""

from __future__ import annotations

import logging
from collections.abc import Iterable
from typing import BinaryIO, cast

from flask import Blueprint, Request, g, request
from werkzeug.datastructures import FileStorage

from ..auth.middleware import require_session_or_env
from ..services.catalog import CatalogService
from ..util.errors import APIError, NotFoundError
from ..util.json import json_response
from . import get_container

logger = logging.getLogger(__name__)
bp = Blueprint("uploads", __name__, url_prefix="/api/upload")


def _enforce_rate_limit(req: Request) -> None:
    container = get_container()
    container.rate_limiter.enforce(req)


def _normalize_prefix(prefix: str | None) -> str:
    if not prefix:
        return ""
    normalized = prefix.replace("\\", "/").strip()
    normalized = normalized.strip("/")
    if not normalized:
        return ""
    segments = _sanitize_segments(normalized.split("/"))
    return "/".join(segments)


def _sanitize_segments(segments: Iterable[str]) -> list[str]:
    cleaned: list[str] = []
    for segment in segments:
        part = segment.strip()
        if not part or part in {".", ".."}:
            continue
        cleaned.append(part)
    return cleaned


def _normalize_relative_path(filename: str | None) -> str:
    candidate = (filename or "").strip()
    if not candidate:
        raise APIError(code="invalid_file", message="Uploaded file is missing a name", http_status=400)
    normalized = candidate.replace("\\", "/")
    segments = _sanitize_segments(normalized.split("/"))
    if not segments:
        raise APIError(code="invalid_file", message="Uploaded file resolved to an empty path", http_status=400)
    return "/".join(segments)


def _join_key(prefix: str, relative_path: str) -> str:
    if prefix:
        return f"{prefix}/{relative_path}"
    return relative_path


@bp.post("/")
@require_session_or_env
def upload_objects():
    try:
        logger.info("Upload request started")
        _enforce_rate_limit(request)

        # Use session SDK
        sdk = g.sdk_client
        catalog = CatalogService(sdk=sdk)

        bucket = request.form.get("bucket", "").strip()
        if not bucket:
            logger.warning("Upload failed: missing bucket parameter")
            raise APIError(code="invalid_bucket", message="bucket form field is required", http_status=400)

        logger.info(f"Upload to bucket: {bucket}")

        # Use efficient bucket existence check
        if not catalog.bucket_exists(bucket):
            logger.warning(f"Upload failed: bucket not found: {bucket}")
            raise NotFoundError("bucket", "bucket_not_found")

        prefix = _normalize_prefix(request.form.get("prefix"))
        files: list[FileStorage] = request.files.getlist("files")
        if not files:
            logger.warning("Upload failed: no files provided")
            raise APIError(code="invalid_request", message="No files provided in upload", http_status=400)

        logger.info(f"Processing {len(files)} file(s) with prefix: {prefix or '(root)'}")

        results = []
        total_original = 0
        total_stored = 0

        for index, file_storage in enumerate(files):
            try:
                source_name = file_storage.filename or file_storage.name or f"file-{index}"
                relative_path = _normalize_relative_path(source_name)
                key = _join_key(prefix, relative_path)

                logger.info(f"Uploading file [{index + 1}/{len(files)}]: {key}")

                if hasattr(file_storage.stream, "seek"):
                    try:  # pragma: no cover - stream may not support seek in tests
                        file_storage.stream.seek(0)
                    except (OSError, AttributeError):
                        pass

                summary = catalog.upload_object(
                    bucket=bucket,
                    key=key,
                    file_obj=cast(BinaryIO, file_storage.stream),
                    relative_path=relative_path,
                )

                logger.info(
                    f"Upload complete: {key} | "
                    f"Original: {summary.original_bytes}B, "
                    f"Stored: {summary.stored_bytes}B, "
                    f"Savings: {summary.original_bytes - summary.stored_bytes}B"
                )

                results.append(summary.to_dict())
                total_original += summary.original_bytes
                total_stored += summary.stored_bytes

            except Exception as file_error:
                logger.error(f"Failed to upload file [{index + 1}/{len(files)}]: {source_name}", exc_info=file_error)
                # Re-raise to trigger global error handler
                raise

        savings_bytes = max(total_original - total_stored, 0)
        savings_pct = 0.0
        if total_original:
            savings_pct = (savings_bytes / total_original) * 100.0

        logger.info(
            f"Upload batch complete: {len(results)} file(s) | "
            f"Total original: {total_original}B, "
            f"Total stored: {total_stored}B, "
            f"Savings: {savings_pct:.1f}%"
        )

        payload = {
            "bucket": bucket,
            "prefix": prefix,
            "results": results,
            "stats": {
                "count": len(results),
                "original_bytes": total_original,
                "stored_bytes": total_stored,
                "savings_bytes": savings_bytes,
                "savings_pct": savings_pct,
            },
        }
        return json_response(payload)

    except APIError:
        # APIError is already handled by error handler, just re-raise
        raise
    except Exception as e:
        # Log unexpected errors with full stack trace
        logger.error("Unexpected error in upload endpoint", exc_info=e)
        # Re-raise to trigger global error handler which returns JSON
        raise


__all__ = ["bp"]
