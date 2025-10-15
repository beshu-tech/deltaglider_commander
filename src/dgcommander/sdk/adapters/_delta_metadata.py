"""Helpers for resolving accurate metadata for delta-compressed objects."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class DeltaMetadata:
    """Resolved metadata for a delta-compressed object."""

    physical_key: str | None
    original_bytes: int | None
    stored_bytes: int | None


class DeltaMetadataResolver:
    """Resolve authoritative size information for delta-compressed objects.

    This helper issues targeted ``HEAD`` requests to S3 when the deltaglider
    list API fails to provide ``deltaglider-original-size`` metadata. Callers
    should treat the returned ``DeltaMetadata`` as advisory: the resolver
    returns ``None`` values when it cannot determine accurate sizes.

    The resolver swallows ``NoSuchKey``/``404`` errors so callers can fall
    back gracefully. Other ``ClientError`` instances are logged and ignored.
    Any unexpected exception from the underlying S3 client is propagated so
    the caller can decide how to surface the failure.
    """

    def __init__(self, s3_client: Any) -> None:
        self._s3_client = s3_client

    def resolve(self, bucket: str, display_key: str) -> DeltaMetadata:
        normalized_display = display_key.lstrip("/")

        candidates: list[str] = []
        if not normalized_display.endswith(".delta"):
            candidates.append(f"{normalized_display}.delta")
        candidates.append(normalized_display)

        for candidate in candidates:
            try:
                response = self._s3_client.head_object(Bucket=bucket, Key=candidate)
            except ClientError as exc:
                error_code = exc.response.get("Error", {}).get("Code", "")
                if error_code in {"NoSuchKey", "404"}:
                    continue
                logger.debug(
                    "HEAD %s/%s failed while resolving compression metadata: %s",
                    bucket,
                    candidate,
                    error_code or exc,
                    exc_info=True,
                )
                continue

            metadata = response.get("Metadata", {}) or {}
            original_size = _safe_int(
                metadata.get("dg-file-size") or metadata.get("file_size") or metadata.get("deltaglider-original-size")
            )
            stored_size = _safe_int(
                metadata.get("dg-delta-size") or metadata.get("delta-size") or metadata.get("deltaglider-delta-size")
            )

            content_length = response.get("ContentLength")
            if stored_size is None and content_length is not None:
                stored_size = int(content_length)
            if original_size is None:
                original_size = stored_size

            return DeltaMetadata(candidate, original_size, stored_size)

        return DeltaMetadata(None, None, None)


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


__all__ = ["DeltaMetadata", "DeltaMetadataResolver"]
