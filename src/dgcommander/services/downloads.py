"""Download pipeline helpers."""

from __future__ import annotations

import io
from datetime import UTC, datetime, timedelta

from itsdangerous import BadSignature, URLSafeTimedSerializer

from ..util.errors import APIError, NotFoundError
from ..util.types import DownloadPreparation
from .deltaglider import DeltaGliderSDK


class DownloadService:
    def __init__(self, sdk: DeltaGliderSDK, *, secret_key: str, ttl_seconds: int = 300) -> None:
        self._sdk = sdk
        self._secret_key = secret_key
        self._serializer = URLSafeTimedSerializer(secret_key, salt="dg-download")
        self._ttl_seconds = ttl_seconds

    @property
    def secret_key(self) -> str:
        return self._secret_key

    @property
    def ttl_seconds(self) -> int:
        return self._ttl_seconds

    def prepare(self, bucket: str, key: str, credentials: dict | None = None) -> DownloadPreparation:
        try:
            estimated = self._sdk.estimated_object_size(bucket, key)
        except FileNotFoundError as exc:
            raise NotFoundError("object", "key_not_found") from exc
        issued_at = datetime.now(UTC).isoformat()

        # Store credentials in token for SDK reconstruction during download
        token_data = {
            "bucket": bucket,
            "key": key,
            "issued_at": issued_at,
            "credentials": credentials,  # Embed credentials in signed token
        }
        token = self._serializer.dumps(token_data)
        return DownloadPreparation(bucket=bucket, key=key, download_token=token, estimated_bytes=estimated)

    def resolve_token(
        self, token: str, sdk_override: DeltaGliderSDK | None = None
    ) -> tuple[str, str, io.BufferedReader]:
        try:
            payload = self._serializer.loads(token)
        except BadSignature as exc:
            raise APIError(code="invalid_token", message="Invalid download token", http_status=400) from exc
        bucket = payload.get("bucket")
        key = payload.get("key")
        issued_raw = payload.get("issued_at")
        credentials = payload.get("credentials")

        if not bucket or not key or not issued_raw:
            raise APIError(code="invalid_token", message="Invalid download token", http_status=400)
        try:
            issued_at = datetime.fromisoformat(issued_raw)
        except ValueError as exc:
            raise APIError(code="invalid_token", message="Invalid download token", http_status=400) from exc
        if issued_at.tzinfo is None:
            issued_at = issued_at.replace(tzinfo=UTC)
        age = datetime.now(UTC) - issued_at
        if age > timedelta(seconds=self._ttl_seconds):
            raise APIError(code="token_expired", message="Download token expired", http_status=400)

        # Use provided SDK override or reconstruct from credentials or use default
        sdk = sdk_override or self._build_sdk_from_credentials(credentials) or self._sdk

        try:
            stream = sdk.open_object_stream(bucket, key)
        except FileNotFoundError as exc:
            raise NotFoundError("object", "key_not_found") from exc
        return bucket, key, stream

    def _build_sdk_from_credentials(self, credentials: dict | None) -> DeltaGliderSDK | None:
        """Build SDK from credentials stored in token."""
        if not credentials:
            return None

        import logging

        logger = logging.getLogger(__name__)

        from .deltaglider import S3DeltaGliderSDK, S3Settings

        logger.info(f"Building SDK from credentials: {credentials.keys()}")
        logger.info(f"Endpoint from credentials: {credentials.get('endpoint')}")
        logger.info(f"Region from credentials: {credentials.get('region')}")
        logger.info(
            f"Access key from credentials: {credentials.get('access_key_id', '')[:10]}..."
            if credentials.get("access_key_id")
            else "No access key"
        )

        settings = S3Settings(
            endpoint_url=credentials.get("endpoint"),
            region_name=credentials.get("region"),
            access_key_id=credentials.get("access_key_id"),
            secret_access_key=credentials.get("secret_access_key"),
            session_token=credentials.get("session_token"),
            addressing_style=credentials.get("addressing_style", "path"),
            verify=credentials.get("verify", True),
            cache_dir=credentials.get("cache_dir"),
        )
        logger.info(f"Created S3Settings with endpoint: {settings.endpoint_url}")
        return S3DeltaGliderSDK(settings)
