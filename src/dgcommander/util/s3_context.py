"""Utilities for extracting S3 context information for error reporting."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from dgcommander.sdk.adapters.s3 import S3Settings


@dataclass(frozen=True, slots=True)
class S3Context:
    """S3 connection context for error reporting."""

    endpoint: str
    access_key_preview: str
    region: str


def extract_s3_context_from_sdk(sdk: Any) -> S3Context | None:
    """
    Extract S3 context from an SDK instance.

    Args:
        sdk: SDK instance (S3DeltaGliderSDK or other)

    Returns:
        S3Context if SDK is S3-backed, None otherwise
    """
    # Check if this is an S3-backed SDK
    if not hasattr(sdk, "_settings"):
        return None

    settings = sdk._settings
    return extract_s3_context_from_settings(settings)


def extract_s3_context_from_settings(settings: S3Settings) -> S3Context:
    """
    Extract S3 context from S3Settings.

    Args:
        settings: S3Settings instance

    Returns:
        S3Context with connection information
    """
    access_key = settings.access_key_id or ""
    access_key_preview = access_key[:8] + "..." if len(access_key) > 8 else access_key

    endpoint = settings.endpoint_url or "https://s3.amazonaws.com"
    region = settings.region_name or "eu-west-1"

    return S3Context(
        endpoint=endpoint,
        access_key_preview=access_key_preview,
        region=region,
    )


def extract_s3_context_from_credentials(credentials: dict) -> S3Context:
    """
    Extract S3 context from credential dictionary.

    Args:
        credentials: Credential dictionary with access_key_id, endpoint, region

    Returns:
        S3Context with connection information
    """
    access_key = str(credentials.get("access_key_id", "")).strip()
    access_key_preview = access_key[:8] + "..." if len(access_key) > 8 else access_key

    endpoint = credentials.get("endpoint", "") or "https://s3.amazonaws.com"
    region = credentials.get("region", "eu-west-1")

    return S3Context(
        endpoint=endpoint,
        access_key_preview=access_key_preview,
        region=region,
    )


def format_s3_context(context: S3Context | None) -> dict[str, str]:
    """
    Format S3 context as a dictionary for error details.

    Args:
        context: S3Context or None

    Returns:
        Dictionary with s3_endpoint and s3_access_key fields
    """
    if context is None:
        return {}

    return {
        "s3_endpoint": context.endpoint,
        "s3_access_key": context.access_key_preview,
        "s3_region": context.region,
    }


def format_s3_context_string(context: S3Context | None) -> str:
    """
    Format S3 context as an inline string for error messages.

    Args:
        context: S3Context or None

    Returns:
        Formatted string like " (endpoint: https://..., key: AKIA...)"
        or empty string if context is None

    Examples:
        >>> ctx = S3Context("https://s3.amazonaws.com", "AKIATEST...", "us-east-1")
        >>> format_s3_context_string(ctx)
        ' (endpoint: https://s3.amazonaws.com, key: AKIATEST...)'
    """
    if context is None:
        return ""

    return f" (endpoint: {context.endpoint}, key: {context.access_key_preview})"


__all__ = [
    "S3Context",
    "extract_s3_context_from_sdk",
    "extract_s3_context_from_settings",
    "extract_s3_context_from_credentials",
    "format_s3_context",
    "format_s3_context_string",
]
