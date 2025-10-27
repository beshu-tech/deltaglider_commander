"""
Dependency injection helpers for API endpoints.
Reduces boilerplate by centralizing service instantiation.
"""

from __future__ import annotations

from flask import current_app, g

from ..services.catalog import CatalogService
from ..services.deltaglider import DeltaGliderSDK


def get_sdk() -> DeltaGliderSDK:
    """
    Get the session-specific SDK client.

    Returns:
        DeltaGliderSDK: SDK client from Flask g context (injected by auth middleware)

    Raises:
        RuntimeError: If called outside request context or without auth middleware
    """
    if not hasattr(g, "sdk_client"):
        raise RuntimeError("SDK client not available. Ensure require_session_or_env middleware is applied.")
    return g.sdk_client


def get_catalog() -> CatalogService:
    """
    Get catalog service with session SDK and shared cache.

    This is the primary way to get a CatalogService in API endpoints.
    It automatically:
    - Uses the session-specific SDK from g.sdk_client
    - Retrieves shared list_cache from app extensions for performance
    - Handles missing cache gracefully (falls back to no cache)

    Returns:
        CatalogService: Fully configured catalog service instance

    Example:
        @bp.get("/")
        @require_session_or_env
        def list_buckets():
            catalog = get_catalog()
            return catalog.list_buckets()
    """
    sdk = get_sdk()

    # Get shared cache from app extensions (for session-isolated caching)
    services = current_app.extensions.get("dgcommander")
    shared_cache = services.catalog.list_cache if services else None

    return CatalogService(sdk=sdk, list_cache=shared_cache)


def get_credentials():
    """
    Get credentials from Flask g context (if available).

    Returns:
        Credentials object or None if not available

    Note:
        Credentials are injected by require_session_or_env middleware
    """
    return getattr(g, "credentials", None)


__all__ = ["get_sdk", "get_catalog", "get_credentials"]
