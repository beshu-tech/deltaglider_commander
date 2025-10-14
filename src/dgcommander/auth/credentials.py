"""Helpers for building and validating DeltaGlider S3 credentials."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from botocore.exceptions import ClientError

from dgcommander.services.deltaglider import S3DeltaGliderSDK, S3Settings


class InvalidCredentialsError(Exception):
    """Raised when AWS credentials are invalid."""


class S3AccessDeniedError(Exception):
    """Raised when AWS credentials are valid but lack S3 permissions."""


@dataclass(frozen=True, slots=True)
class CredentialContext:
    """Derived information about the credential payload."""

    endpoint: str | None
    region: str
    access_key_preview: str
    addressing_style: str
    verify: bool


def _normalize_endpoint(endpoint: str | None) -> str | None:
    if endpoint == "":
        return None
    return endpoint


def _credential_context(credentials: dict) -> CredentialContext:
    return CredentialContext(
        endpoint=_normalize_endpoint(credentials.get("endpoint")),
        region=credentials.get("region", "us-east-1"),
        access_key_preview=(credentials.get("access_key_id", "")[:8] or ""),
        addressing_style=credentials.get("addressing_style", "path"),
        verify=credentials.get("verify", True),
    )


def build_s3_settings(credentials: dict, *, cache_dir: str | None = None) -> S3Settings:
    """Create ``S3Settings`` from a credential payload with normalization."""

    context = _credential_context(credentials)
    return S3Settings(
        endpoint_url=context.endpoint,
        region_name=context.region,
        access_key_id=credentials["access_key_id"],
        secret_access_key=credentials["secret_access_key"],
        session_token=credentials.get("session_token"),
        addressing_style=context.addressing_style,
        verify=context.verify,
        cache_dir=cache_dir,
    )


def create_sdk(settings: S3Settings) -> S3DeltaGliderSDK:
    """Instantiate the SDK for the supplied settings."""

    return S3DeltaGliderSDK(settings)


def create_sdk_from_credentials(
    credentials: dict,
    *,
    cache_dir: str | None = None,
) -> S3DeltaGliderSDK:
    """Convenience helper that builds settings and returns an SDK instance."""

    settings = build_s3_settings(credentials, cache_dir=cache_dir)
    return create_sdk(settings)


def log_credential_preview(credentials: dict, *, logger: logging.Logger) -> None:
    """Log non-sensitive credential details for diagnostics."""

    context = _credential_context(credentials)
    logger.info("Validating credentials:")
    logger.info("  Access Key: %s...", context.access_key_preview)
    logger.info("  Secret Key: %s", "***" if credentials.get("secret_access_key") else "MISSING")
    logger.info("  Region: %s", context.region)
    logger.info("  Endpoint: %s", context.endpoint or "DEFAULT AWS")
    logger.info("  Addressing Style: %s", context.addressing_style)
    logger.info("  TLS Verify: %s", "enabled" if context.verify else "disabled")


def validate_credentials(credentials: dict, *, logger: logging.Logger | None = None) -> None:
    """Validate that an SDK session can list buckets using the given credentials."""

    if logger is not None:
        log_credential_preview(credentials, logger=logger)

    try:
        sdk = create_sdk_from_credentials(credentials)
        sdk.list_buckets()
    except ClientError as exc:
        error = exc.response.get("Error", {})
        error_code = error.get("Code", "")
        error_message = error.get("Message", "")

        if logger is not None:
            logger.error("AWS ClientError during validation: %s - %s", error_code, error_message)
            logger.error("Full error response: %s", exc.response)

        if error_code in {"InvalidAccessKeyId", "SignatureDoesNotMatch"}:
            raise InvalidCredentialsError("Invalid AWS credentials") from exc
        if error_code == "AccessDenied":
            raise S3AccessDeniedError("Valid credentials but insufficient S3 permissions") from exc
        raise


__all__ = [
    "CredentialContext",
    "InvalidCredentialsError",
    "S3AccessDeniedError",
    "build_s3_settings",
    "create_sdk",
    "create_sdk_from_credentials",
    "log_credential_preview",
    "validate_credentials",
]
