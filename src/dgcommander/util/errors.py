"""Application-level error definitions and helpers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from flask import Flask, jsonify


@dataclass(slots=True)
class APIError(Exception):
    """Domain-specific error that maps to JSON API responses."""

    code: str
    message: str
    http_status: int = 400
    details: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "error": {
                "code": self.code,
                "message": self.message,
            }
        }
        if self.details:
            payload["error"]["details"] = self.details
        return payload


class RateLimitExceeded(APIError):
    def __init__(self, message: str = "Rate limit exceeded") -> None:
        super().__init__(code="throttled", message=message, http_status=429)


class NotFoundError(APIError):
    def __init__(self, resource: str, code: str) -> None:
        super().__init__(
            code=code,
            message=f"{resource} not found",
            http_status=404,
        )


class SDKError(APIError):
    """Raised when the underlying DeltaGlider SDK fails.

    Default to 503 (Service Unavailable) for S3/storage backend failures.
    Use custom http_status for specific error conditions (e.g., 403 for permissions).

    Note: 502 Bad Gateway is reserved for proxy/gateway failures, not application errors.
    """

    def __init__(
        self,
        message: str = "Storage backend error",
        *,
        details: dict[str, Any] | None = None,
        http_status: int = 503,
    ) -> None:
        super().__init__(
            code="sdk_error",
            message=message,
            http_status=http_status,
            details=details,
        )


def register_error_handlers(app: Flask) -> None:
    """Attach error handlers that translate exceptions into API responses."""

    @app.errorhandler(APIError)
    def handle_api_error(err: APIError):  # type: ignore[override]
        response = jsonify(err.to_dict())
        response.status_code = err.http_status
        return response

    @app.errorhandler(404)
    def handle_404(_err):  # type: ignore[override]
        response = jsonify({"error": {"code": "not_found", "message": "Route not found"}})
        response.status_code = 404
        return response

    @app.errorhandler(Exception)
    def handle_unexpected(err: Exception):  # type: ignore[override]
        app.logger.exception("Unhandled exception", exc_info=err)
        response = jsonify({"error": {"code": "internal_error", "message": "Internal server error"}})
        response.status_code = 500
        return response
