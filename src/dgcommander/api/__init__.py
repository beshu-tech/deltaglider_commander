"""Blueprint helpers for the API package."""

from __future__ import annotations

from flask import current_app

from ..deps import ServiceContainer


def get_container() -> ServiceContainer:
    try:
        return current_app.extensions["dgcommander"]
    except KeyError as exc:  # pragma: no cover - defensive
        raise RuntimeError("Service container not configured") from exc
