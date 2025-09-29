"""Helpers for pagination parameters."""
from __future__ import annotations

import base64
from typing import Optional

from .errors import APIError


def coerce_limit(raw: Optional[str], *, default: int = 200, minimum: int = 1, maximum: int = 1000) -> int:
    if raw is None:
        return default
    try:
        value = int(raw)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise APIError(code="invalid_limit", message="limit must be an integer", http_status=400) from exc
    if value < minimum or value > maximum:
        raise APIError(
            code="invalid_limit",
            message=f"limit must be between {minimum} and {maximum}",
            http_status=400,
        )
    return value


_CURSOR_PREFIX = "offset:"


def encode_cursor(offset: int) -> str:
    payload = f"{_CURSOR_PREFIX}{offset}".encode("utf-8")
    return base64.urlsafe_b64encode(payload).decode("ascii")


def decode_cursor(raw: Optional[str]) -> Optional[int]:
    if not raw:
        return None
    try:
        decoded_bytes = base64.b64decode(raw.encode("ascii"), altchars=b"-_", validate=True)
        decoded = decoded_bytes.decode("utf-8")
    except (ValueError, UnicodeDecodeError) as exc:
        raise APIError(code="invalid_cursor", message="Invalid cursor", http_status=400) from exc
    if not decoded.startswith(_CURSOR_PREFIX):
        raise APIError(code="invalid_cursor", message="Invalid cursor", http_status=400)
    try:
        return int(decoded[len(_CURSOR_PREFIX) :])
    except ValueError as exc:  # pragma: no cover - defensive
        raise APIError(code="invalid_cursor", message="Invalid cursor", http_status=400) from exc

